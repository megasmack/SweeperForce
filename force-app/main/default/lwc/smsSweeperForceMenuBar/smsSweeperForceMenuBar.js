/**
 * Created by Steve M Schrab
 * https://github.com/megasmack/SweeperForce
 */

import { LightningElement, api } from "lwc";
import { loadScript } from "lightning/platformResourceLoader";
import SmsAssets from "@salesforce/resourceUrl/smsSweeperForce";

export default class SmsSweeperForceMenuBar extends LightningElement {

  // --- Private Properties

  isRendered = false;
  isTimerRunning = false;
  clock;
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

  renderedCallback() {
    if (!this.isRendered) {
      this.isRendered = true;

      Promise.all([
        loadScript(this, `${SmsAssets}/sms-clock-icon.js`)
      ])
        .then(() => {
          const clock = document.createElement('sms-clock-icon');
          clock.style.setProperty("--sms-clock_line-width", "0.45rem");
          clock.style.setProperty("--sms-clock_size", "1rem");
          clock.style.setProperty("display", "block");
          this.refs.clock.appendChild(clock);
          this.clock = document.querySelector('sms-clock-icon');
        })
        .catch((error) => console.error(error));
    }
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

  toggleClock() {
    if (this.clock) {
      this.clock.animate = this.isTimerRunning;
    }
  }

  // --- Public Methods ---

  @api
  setTimer() {
    this.isTimerRunning = false;
    this.toggleClock();
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
      this.toggleClock();
      this.timerAction();
      this.dispatchEvent(new CustomEvent("play"));
    }
  }

  @api
  stopTimer() {
    this.isTimerRunning = false;
    this.toggleClock();
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