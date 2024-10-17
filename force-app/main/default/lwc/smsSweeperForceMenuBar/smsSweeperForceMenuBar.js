import { LightningElement, api } from "lwc";

export default class SmsSweeperForceMenuBar extends LightningElement {

  // --- Private Properties

  isTimerRunning = false;
  startTime; // time of first click, if any
  elapsed = 0; // Elapsed time.
  pauseTime = 0;
  visibilityChangeEvent;

  // --- Public Properties ---

  @api flaggedMines = 0;
  @api gameInProgress = false;

  // --- Lifecycle Hooks ---

  connectedCallback() {
    this.visibilityChangeEvent = this.visibilityChange.bind(this);
    document.addEventListener("visibilitychange", this.visibilityChangeEvent);
  }

  disconnectedCallback() {
    document.removeEventListener("visibilitychange", this.visibilityChangeEvent);
  }

  // --- Private Methods ---

  /**
   * Update the elapsed time, and schedule another call.
   */
  timerAction() {
    if (this.isTimerRunning) {
      const now = new Date();
      this.elapsed = Math.floor(
        (now.getTime() - this.startTime.getTime()) / 1000
      ) + this.pauseTime;
      // eslint-disable-next-line @lwc/lwc/no-async-operation
      setTimeout(() => {
        this.timerAction();
      }, 500);
    }
  }

  /**
   * Pause the timer and game when the browser tab is hidden.
   */
  visibilityChange() {
    if (document.hidden && this.gameInProgress) {
      this.stopTimer();
      this.dispatchEvent(new CustomEvent("pause"));
    }
  }

  // --- Public Methods ---

  @api
  setTimer() {
    this.isTimerRunning = false;
    this.startTime = new Date();
    this.elapsed = 0;
    this.pauseTime = 0;
  }

  @api
  startTimer() {
    if (!this.isTimerRunning) {
      // If the timer was paused, add the previous
      // elapsed time and set a new start time.
      if (this.elapsed !== 0) {
        this.pauseTime = this.elapsed;
        this.startTime = new Date();
      }
      this.isTimerRunning = true;
      this.timerAction();
      this.dispatchEvent(new CustomEvent("play"));
    }
  }

  @api
  stopTimer() {
    this.isTimerRunning = false;
  }

  // --- Event Handlers ---

  handlePlayPause() {
    if (this.isTimerRunning) {
      this.stopTimer();
      this.dispatchEvent(new CustomEvent("pause"));
    } else {
      this.startTimer();
    }
  }
}