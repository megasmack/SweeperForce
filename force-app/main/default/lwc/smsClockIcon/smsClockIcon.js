import { LightningElement, api } from "lwc";

export default class SmsClockIcon extends LightningElement {

  // --- Public Properties ---

  @api animate = false;

  // --- Getters ---

  get clockClass() {
    return this.animate ? 'sms-clock sms-run' : 'sms-clock';
  }
}