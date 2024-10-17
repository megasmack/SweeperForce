import LightningModal from "lightning/modal";
import { api } from "lwc";
import SmsAssets from "@salesforce/resourceUrl/smsSweeperForce";

const TABLET_MEDIA_QUERY = '(min-width: 48em)';
const DIFFICULTY = {
  beginner: {
    width: 8,
    height: 8,
    mines: 10
  },
  easy: {
    width: 10,
    height: 10,
    mines: 14
  },
  intermediate: {
    width: 16,
    height: 16,
    mines: 40
  },
  advanced: {
    width: 16,
    height: 30,
    mines: 99
  }
};

export default class SmsSweeperForceModal extends LightningModal {

  // --- Public Properties

  @api
  get difficulty() {
    return this._difficulty;
  }
  set difficulty(string) {
    this._difficulty = string;
  }

  @api
  get volume() {
    return this._volume;
  }
  set volume(num) {
    this._volume = parseInt(num, 10);
    this.sfxVolume = this._volume / 100;
  }

  @api
  get soundFx() {
    return this._soundFx;
  }
  set soundFx(boolean) {
    this._soundFx = boolean;
  }

  // ---Private Properties ---

  _difficulty = "beginner";
  _soundFx = false;
  _volume = 100;

  options = [
    { label: "Beginner", value: "beginner" },
    { label: "Easy", value: "easy" },
    { label: "Intermediate", value: "intermediate" },
    { label: "Advanced", value: "advanced" },
  ];
  sfxVolume = 1;

  profileImage = `${SmsAssets}/images/steve.jpg`;
  resizeEvent;
  sfxTaDa = new Audio();
  sfxDebounce;

  /** @type {"medium" | "small" | "full"} */
  size = "small";

  // --- Lifecycle Hooks ---

  connectedCallback() {
    this.sfxTaDa.src = `${SmsAssets}/audio/tada.mp3`;
    this.resizeEvent = this.resizeModal.bind(this);
    this.resizeEvent();
    window.addEventListener("resize", this.resizeEvent);
    window.addEventListener("orientationChange", this.resizeEvent);
  }

  disconnectedCallback() {
    window.removeEventListener("resize", this.resizeEvent);
    window.removeEventListener("orientationChange", this.resizeEvent);
  }

  playSound() {
    if (this._soundFx) {
      // eslint-disable-next-line @lwc/lwc/no-async-operation
      this.sfxDebounce = setTimeout(() => {
        this.sfxTaDa.volume = this.sfxVolume;
        this.sfxTaDa.play();
        clearTimeout(this.sfxDebounce);
      }, 100);
    }
  }

  // --- Private Methods ---

  /**
   * Sets the height of the "opened" submenu based on the height of the submenu list.
   * Subtracts the border size so "elastic" transition does not cut off element.
   */
  resizeModal() {
    const mediaQuery = window.matchMedia(TABLET_MEDIA_QUERY);
    const isDesktop = mediaQuery.matches;
    this.size = isDesktop ? "small" : "full";
  }

  // --- Getters ---

  get soundIcon() {
    return this._soundFx ? "utility:volume_high" : "utility:volume_off";
  }

  // --- Event Handlers ---

  handleDifficulty(event) {
    this._difficulty = event.target.value;
  }

  handleSoundFx() {
    this._soundFx = !this._soundFx;
    this.playSound();
  }

  handleVolume(event) {
    this._volume = event.target.value;
    this.sfxVolume = parseInt(this._volume, 10) / 100;
    this.playSound();
  }

  handleCancel() {
    this.close();
  }

  /**
   * Grab game settings and pass them as a string to the main game application.
   */
  handleSave() {
    const { width, height, mines } = DIFFICULTY[this._difficulty];
    let settings = {
      difficulty: this._difficulty,
      soundFx: this._soundFx,
      volume: this._volume,
      width,
      height,
      mines
    };
    const settingsString = JSON.stringify(settings);
    this.close(settingsString);
  }
}