/**
 * Created by Steve M Schrab
 * https://github.com/megasmack/SweeperForce
 */

class SmsClockIcon extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // Create styles
    const style = document.createElement('style');
    style.textContent = `
      :host {
        --sms-clock_line-color: currentColor;
        --sms-clock_line-width: 0.25rem;
        --sms-clock_size: 1.5rem;
        --sms-clock_speed: 5s;
          display: inline-block;
      }

      .sms-clock {
        display: block;
        width: var(--sms-clock_size);
        height: var(--sms-clock_size);
      }
      
      .sms-clock-face,
      .sms-clock-minute-hand,
      .sms-clock-hour-hand {
        fill: none;
        stroke-width: var(--sms-clock_line-width);
        stroke: var(--sms-clock_line-color);
      }
      
      .sms-clock-center {
        fill: var(--sms-clock_line-color);
      }
      
      .sms-clock-minute-hand,
      .sms-clock-hour-hand  {
        transform-origin: bottom center;
        animation-duration: var(--sms-clock_speed);
        animation-timing-function: linear;
        animation-iteration-count: infinite;
      }
      
      .sms-clock-hour-hand {
        animation-duration: calc(var(--sms-clock_speed) * 12);
      }
      
      .sms-run .sms-clock-minute-hand,
      .sms-run .sms-clock-hour-hand {
        animation-name: spin;
      }
      
      @media (prefers-reduced-motion) {
        .sms-clock-minute-hand,
        .sms-clock-hour-hand {
          animation: none !important;
        }
      }
      
      @keyframes spin {
        from {
          transform: rotate(0deg);
          transform-origin: 50% 50%;
        }
        to {
          transform: rotate(360deg);
          transform-origin: 50% 50%;
        }
      }
    `;

    // Create HTML structure
    const template = document.createElement('template');
    template.innerHTML = `
      <svg viewBox="0 0 68 68" class="sms-clock" aria-hidden="true">
        <line class="sms-clock-minute-hand" x1="34" y1="34" x2="34" y2="12" />
        <line class="sms-clock-hour-hand" x1="34" y1="34" x2="50" y2="34" />
        <circle class="sms-clock-face" cx="34" cy="34" r="30" />
        <circle class="sms-clock-center" cx="34" cy="34" r="3" />
      </svg>
    `;

    // Attach to shadow DOM
    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    // Store reference to clock container
    this.clockContainer = this.shadowRoot.querySelector('.sms-clock');
  }

  static get observedAttributes() {
    return ['animate'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'animate') {
      if (newValue !== null) {
        this.clockContainer.classList.add('sms-run');
      } else {
        this.clockContainer.classList.remove('sms-run');
      }
    }
  }

  get animate() {
    return this.hasAttribute('animate');
  }

  set animate(value) {
    if (value) {
      this.setAttribute('animate', '');
    } else {
      this.removeAttribute('animate');
    }
  }
}

customElements.define('sms-clock-icon', SmsClockIcon);