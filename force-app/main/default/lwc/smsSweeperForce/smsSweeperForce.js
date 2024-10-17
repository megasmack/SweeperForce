/**
 * Created by Steve M Schrab
 * https://github.com/megasmack/SweeperForce
 */

/**
 * @typedef {import("./typedefs").ForceCell} ForceCell
 */

import { LightningElement } from "lwc";
import SmsSweeperForceModal from "c/smsSweeperForceModal";
import SmsAssets from "@salesforce/resourceUrl/smsSweeperForce";

export default class SmsSweeperForce extends LightningElement {

  // --- Private Properties ---

  isInit = false;
  isDevMode = false;
  isRendered = false;
  isGameInProgress = false;
  isGameOver = false;
  isWin = false;
  difficulty = "beginner";
  volume = 75;
  width = 8;
  height = 8;
  total = 0;
  mines = 10;
  minesToFlag = 10;
  useSfx = false;
  sfxPing = new Audio();
  sfxSplash = new Audio();
  sfxExplode = new Audio();
  sfxThunk = new Audio();
  sfxPop = new Audio();
  sfxWin = new Audio();
  sfxPingPath = `${SmsAssets}/audio/sonar.mp3`;
  sfxSplashPath = `${SmsAssets}/audio/splash.mp3`;
  sfxThunkPath = `${SmsAssets}/audio/thunk.mp3`;
  currentSelected;
  mouseTimer;
  exposed = [];
  flagged = [];
  questioned = [];

  /**
   * Immutable setup data.
   * @type {ForceCell[]}
   */
  grid = [];

  /**
   * Game in progress data.
   * @type {ForceCell[]}
   */
  gridData = [];

  // --- Lifecycle Hooks ---

  renderedCallback() {
    if (!this.isRendered) {
      this.isRendered = true;
      const jsonString = localStorage.getItem("sms-sweeper-force-settings");
      if (jsonString) {
        this.applySettings(jsonString);
      }
      this.setUpGame();
      this.isInit = true;
    }
  }

  // --- Private Methods ---

  /**
   * Apply saved settings for local storage.
   * @param {string} jsonString
   */
  applySettings(jsonString) {
    localStorage.setItem("sms-sweeper-force-settings", jsonString);
    const settings = JSON.parse(jsonString);
    this.useSfx = settings.soundFx;
    this.volume = settings.volume;
    if (this.useSfx) {
      this.enableAudio();
    }

    if (this.difficulty !== settings.difficulty) {
      this.difficulty = settings.difficulty;
      this.width = settings.width;
      this.height = settings.height;
      this.mines = settings.mines;
      this.resetGame();
    }
  }

  /**
   * Set up the game board.
   */
  setUpGame() {
    this.refs?.smsGrid.style.setProperty("--sms-grid-col", `${this.width}`);
    this.total = this.width * this.height;
    const grid = [...Array(this.total)];
    let y = 0;
    this.grid = grid.map((_, i) => {
      const id = i + 1;
      const key = `cell-${id}`;
      let x = (id) % this.width;
      // End of Row
      x = (x === 0) ? this.width : x;
      // New Row
      y = (x === 1) ? y + 1 : y;
      return {
        id,
        key,
        x,
        y,
        ariaLabel: `Row: ${y}, Column: ${x}`,
        adjacent: 0,
        mine: false,
        wave: x + y,
        firstSelected: false,
        flagged: false,
      };
    });
    this.gridData = this.updateGridData();
    this.enableAudio();
  }

  resetGame() {
    this.refs.menu.setTimer();
    this.isGameInProgress = false;
    this.isGameOver = false;
    this.grid = [];
    this.flagged = [];
    this.questioned = [];
    this.exposed = [];
    this.isWin = false;
    this.currentSelected = 0;
    if (this.isInit) {
      this.setUpGame();
      const timeout = this.height * 100;
      this.refs.smsGrid.classList.remove("sms-winner");
      this.refs.smsGrid.classList.remove("sms-lost");
      this.refs.smsGrid.classList.add("reset");
      // eslint-disable-next-line @lwc/lwc/no-async-operation
      setTimeout(() => {
        // Remove on animation finish
        this.refs.smsGrid.classList.remove("reset");
      }, timeout);
    }
  }

  gameOver() {
    this.refs.menu.stopTimer();
    this.isGameInProgress = false;
    this.isGameOver = true;
    this.isWin = false;
    this.sfxExplode.play();
  }

  /**
   * Set up the mines and adjacent data.
   */
  layMines() {
    const setAdjacentNumbers = (index) => {
      // Increase adjacency count, if this isn't itself a mine
      if (this.grid[index].mine === false) {
        this.grid[index].adjacent += 1;
      }
    };

    let laid = 0;
    while (laid < this.mines) {
      const index = Math.floor(Math.random() * this.total);
      // Check if cell is a mine already and don"t set a mine on the player"s first clicked cell.
      if (index < this.total && !this.grid[index]?.mine && !this.grid[index]?.firstSelected) {
        this.grid[index].mine = true;
        laid += 1;
        this.applyToAdjacentCells(index, setAdjacentNumbers);
      }
    }
  }

  /**
   * Update game board
   * @returns {(*&{distance: number|number, flagged: boolean, questioned: boolean, classes: string, exposed: boolean, belowStyles: string, adjacent: number|[]|string|*|string, styles: string})[]}
   */
  updateGridData() {
    this.minesToFlag = this.mines - this.flagged?.length;
    return this.grid.map((cell, i) => {
      const distance = this.currentSelected != null
        ? this.distanceFromSelected(cell, this.grid[this.currentSelected])
        : 0;
      const isExposed = this.exposed.includes(cell.id) && !this.isWin;
      const isFlagged = this.flagged.includes(cell.id);
      const isQuestioned = this.questioned.includes(cell.id);
      const isAdjacent = cell.adjacent > 0;
      const zIndex = this.currentSelected === i
        ? this.width
        : this.width - distance;
      return {
        ...cell,
        adjacent: isAdjacent ? cell.adjacent : "",
        distance,
        flagged: isFlagged,
        questioned: isQuestioned,
        exposed: isExposed,
        classes: isExposed ? `sms-cell_top exposed` : "sms-cell_top",
        styles: `--sms-radiate: ${distance}; --sms-cell-z-index: ${zIndex};`,
        belowStyles: isExposed
          ? `--sms-wave: ${cell.wave}; --sms-adjacent-color: var(--sms-adjacent-color-${cell.adjacent});`
          : `--sms-wave: ${cell.wave};`
      };
    });
  }

  /**
   * Preloads sound effects when sound enabled.
   */
  enableAudio() {
    if (this.useSfx) {
      this.sfxPing.src = this.sfxPingPath;
      this.sfxPing.load();
      this.sfxPing.volume = this.sfxVolume;
      this.sfxSplash.src = this.sfxSplashPath;
      this.sfxSplash.load();
      this.sfxSplash.volume = this.sfxVolume;
      this.sfxExplode.src = `${SmsAssets}/audio/explosion.mp3`;
      this.sfxExplode.load();
      this.sfxExplode.volume = this.sfxVolume;
      this.sfxThunk.src = this.sfxThunkPath;
      this.sfxThunk.load();
      this.sfxThunk.volume = this.sfxVolume;
      this.sfxPop.src = `${SmsAssets}/audio/question-pop.mp3`;
      this.sfxPop.load();
      this.sfxPop.volume = this.sfxVolume;
      this.sfxWin.src = `${SmsAssets}/audio/win.mp3`;
      this.sfxWin.load();
      this.sfxWin.volume = this.sfxVolume;
    }
  }

  /**
   * Set the distance from the selectedCell to a given cell.
   * @param {ForceCell} cell
   * @param {ForceCell} selectedCell
   * @returns {number}
   */
  distanceFromSelected(cell, selectedCell) {
    const distanceY = Math.abs(cell.y - selectedCell.y);
    if (selectedCell.id !== cell.id) {
      return Math.abs(cell.x - selectedCell.x) + distanceY;
    }
    return 0;
  }

  /**
   * Sets the delay distance from the selected cell.
   * Creates a radiating animation.
   * @param {number} index - Position index in array.
   */
  exposeFromSelected(index) {
    let tempExposed = [];

    // Checks if cell is already exposed. If not, expose cell.
    const expose = (i) => {
      const cell = this.grid[i];
      const isExposed = tempExposed.includes((c) => c === cell.id);
      if (!isExposed) {
        tempExposed.push(cell.id);
      }
    };

    // Sweep through grid to expose adjacent zeroes.
    const sweepExposeGrid = (i, xY = "y", dir = 1) => {
      const thisGridRow = this.grid.filter((c) => c[xY] === i);
      const previousGridRow = this.grid.filter((c) => c[xY] === i + dir);
      if (previousGridRow.length > 0) {
        thisGridRow.forEach((c, n) => {
          if (
            c.adjacent === 0 &&
            !tempExposed.includes(c.id) &&
            previousGridRow[n].adjacent === 0 &&
            tempExposed.includes(previousGridRow[n].id)
          ) {
            const exposeCellIndex = this.grid.findIndex((e) => e.id === c.id);
            expose(exposeCellIndex);
          }
        });
      }
    };

    const cell = this.grid[index];
    if (cell.mine) {
      // -- Boom
      this.gameOver();
    } else if (cell.adjacent !== 0) {
      // -- Expose
      expose(index);
      if (this.useSfx) {
        const sfxPing = new Audio(this.sfxPingPath);
        sfxPing.volume = this.sfxVolume;
        sfxPing.play();
      }
    } else {
      // -- Expose Zero and any adjacent zeros

      // Get zero cells adjacent to origin cell clicked in the same row
      const startGridRow = this.grid.filter((c) => c.y === cell.y);
      const startCellIndex = startGridRow.findIndex((c) => c.id === cell.id);

      // From Origin to Right
      for (let x = startCellIndex; x < this.width; x++) {
        const thisCell = startGridRow[x];
        const i = this.grid.findIndex((c) => c.id === thisCell.id);
        if (thisCell?.adjacent === 0) {
          expose(i);
        } else {
          break;
        }
      }

      // From Origin to Left
      for (let x = startCellIndex; x >= 0; x--) {
        const thisCell = startGridRow[x];
        const i = this.grid.findIndex((c) => c.id === thisCell.id);
        if (thisCell?.adjacent === 0) {
          expose(i);
        } else {
          break;
        }
      }

      // From Center to Bottom
      for (let i = cell.y + 1; i <= this.height; i++) {
        sweepExposeGrid(i, "y", -1);
      }
      // From Center to Top
      for (let i = cell.y - 1; i > 0; i--) {
        sweepExposeGrid(i, "y", 1);
      }

      // From Left to Right
      for (let i = 1; i <= this.width; i++) {
        sweepExposeGrid(i, "x", -1);
      }

      // From Right to Left
      for (let i = this.width; i > 0; i--) {
        sweepExposeGrid(i, "x", 1);
      }

      // From Top to Bottom
      for (let i = 1; i <= this.height; i++) {
        sweepExposeGrid(i, "y", 1);
      }

      // From Bottom to Top
      for (let i = this.height; i > 0; i--) {
        sweepExposeGrid(i, "y", -1);
      }

      tempExposed.forEach((e) => {
        const exposedCellIndex = this.grid.findIndex((c) => c.id === e);
        this.applyToAdjacentCells(exposedCellIndex, expose);
      });

      if (this.useSfx && tempExposed.length > 4) {
        this.sfxSplash.volume = this.sfxVolume;
        this.sfxSplash.play();
      }
    }

    this.exposed = [...new Set([...this.exposed, ...tempExposed])];
  }

  /**
   * Apply a given function to each adjacent cell.
   * @param {number} index
   * @param {function} f
   */
  applyToAdjacentCells(index, f) {
    const x = index % this.width;
    // Check for row above.
    if (index >= this.width) {
      if (x > 0) {
        f(index - this.width - 1);
      }
      f(index - this.width);
      if (x + 1 < this.width) {
        f(index - this.width + 1);
      }
    }
    // Check left.
    if (x > 0) {
      f(index - 1);
    }
    // Check right.
    if (x + 1 < this.width) {
      f(index + 1);
    }
    // Check for row below.
    if (index < this.total - this.width) {
      if (x > 0) {
        f(index + this.width - 1);
      }
      f(index + this.width);
      if (x + 1 < this.width) {
        f(index + this.width + 1);
      }
    }
  }

  flagCell(id) {
    const isQuestioned = this.questioned.includes(id);
    const isFlagged = this.flagged.includes(id);

    // Remove Question
    if (isQuestioned) {
      const i = this.questioned.findIndex((c) => c === id);
      this.questioned.splice(i, 1);
    }

    // Remove Flag / Add Question
    if (isFlagged) {
      const i = this.flagged.findIndex((c) => c === id);
      this.flagged.splice(i, 1);
      this.questioned.push(id);
      if (this.useSfx) {
        this.sfxPop.play();
      }
    }

    // Flag
    if (!isFlagged && !isQuestioned) {
      this.flagged.push(id);
      if (this.useSfx) {
        this.sfxThunk.play();
      }
    }
  }

  /**
   * Gets the index of the center(most) cell.
   * @returns {number}
   */
  getCenterCell() {
    const x = Math.floor(this.width / 2);
    const y = Math.floor(this.height / 2);
    return this.grid.findIndex((c) => c.x === x && c.y === y);
  }

  /**
   * Check if game is won or lost.
   */
  checkWinCondition() {
    if (this.exposed.length === this.total - this.mines) {
      const minesFlagged = this.exposed.every((i) => {
        const cell = this.grid.find((c) => c.id === i);
        return !cell?.mine;
      });
      this.refs.menu.stopTimer();
      this.isGameInProgress = false;
      this.isGameOver = true;
      if (minesFlagged) {
        // Mine correctly flagged
        this.currentSelected = this.getCenterCell();
        this.isWin = true;
        this.refs.smsGrid.classList.remove("sms-lost");
        this.refs.smsGrid.classList.add("sms-winner");
        this.gridData = this.updateGridData();
        if (this.useSfx) {
          this.sfxWin.play();
        }
      } else {
        this.gameOver();
      }
    }
  }

  selectOrFlagCell(id, flag) {
    const thisId = parseInt(id, 10);
    const index = this.grid.findIndex((c) => c.id === thisId);
    const isFirstClick = !this.grid.some((c) => c?.firstSelected);

    if (this.isGameOver || this.exposed.includes(thisId)) {
      // Do nothing when the game is over or cell was exposed.
      return;
    }

    // Set selected cell.
    this.currentSelected = index;

    // If this is the first click, generate the game map.
    // We do this to prevent the player from hitting a mine on their first click.
    if (isFirstClick) {
      this.isGameInProgress = true;
      this.grid[index].firstSelected = true;
      this.layMines();
      this.refs.menu.setTimer();
      this.refs.menu.startTimer();
    }

    if (flag) {
      // --- Flag Cell
      this.flagCell(thisId);
    } else {
      // --- Expose Cell
      this.exposeFromSelected(index);
    }

    if (this.isGameOver) {
      this.refs.smsGrid.classList.add("sms-lost");
    } else {
      this.refs.smsGrid.classList.add("selected");
      // eslint-disable-next-line @lwc/lwc/no-async-operation
      setTimeout(() => {
        // Remove on animation finish
        this.refs.smsGrid.classList.remove("selected");
      }, 1000);
    }
    this.gridData = this.updateGridData();
    this.checkWinCondition();
  }

  // --- Getters ---

  get sfxVolume() {
    return parseInt(this.volume, 10) / 100;
  }

  // --- Event Handlers ---

  handleCellStart(event) {
    const { key } = event;
    const { id } = event.currentTarget.dataset;
    const isRightMouseClick = event.which === 3;
    const isKeyClick = event.which === 13 || event.which === 32;

    // Check if using keyboard to select.
    if (key && !isKeyClick) {
      return;
    }

    if (isRightMouseClick || (isKeyClick && event.shiftKey)) {
      // Flag if right click or space or enter key pressed.
      this.selectOrFlagCell(id, true);
    } else {
      // Flag if long press
      // eslint-disable-next-line @lwc/lwc/no-async-operation
      this.mouseTimer = setTimeout(() => {
        this.selectOrFlagCell(id, true);
        clearTimeout(this.mouseTimer);
        this.mouseTimer = null;
      }, 1000);
    }
  }

  handleCellEnd(event) {
    const { id } = event.currentTarget.dataset;

    if (this.mouseTimer) {
      clearTimeout(this.mouseTimer);
      this.mouseTimer = null;
      this.selectOrFlagCell(id, false);
    }
  }

  handleCellTouchStart(event) {
    this.handleCellStart(event);
  }

  handleCellTouchEnd(event) {
    this.handleCellEnd(event);
  }

  handleSettings() {
    SmsSweeperForceModal.open({
      difficulty: this.difficulty,
      soundFx: this.useSfx,
      volume: this.volume
    }).then((response) => {
      if (response) {
        this.applySettings(response);
      }
    });
  }

  handleRestart() {
    this.resetGame();
  }

  handlePause() {
    this.refs.smsGrid.classList.add("sms-paused");
  }

  handlePlay() {
    this.refs.smsGrid.classList.remove("sms-paused");
  }

  handleDisableEvent(event) {
    event.preventDefault();
  }
}