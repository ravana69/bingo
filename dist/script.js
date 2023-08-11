'use strict';
/**
* Bingo - technical test by Lewis Lane
* Configure the input numbers, interval between calls and ticket settings below - try making 30 numbers and 6 rows per ticket for instance!
**/

const inputNumbers =
'011722475204365360702637497481233455758302154058881928446789061241507324334876840738576186051132437816395663800818206590104559628214294664710935667287132130687703253151692742547985',
intervalSeconds = 1,
numbersPerTicket = 15,
rowsPerTicket = 3;

// Polyfills
/*ignore jslint start*/
Array.prototype.fill ||
Object.defineProperty(Array.prototype, "fill", {
  value: function (t) {
    if (null == this) throw new TypeError("this is null or not defined");
    for (
    var r = Object(this),
    e = r.length >>> 0,
    i = arguments[1] >> 0,
    n = i < 0 ? Math.max(e + i, 0) : Math.min(i, e),
    o = arguments[2],
    a = void 0 === o ? e : o >> 0,
    l = a < 0 ? Math.max(e + a, 0) : Math.min(a, e);
    n < l;)


    r[n] = t, n++;
    return r;
  } });

/*ignore jslint end*/

// Main game class
class Bingo {
  constructor(inputNumbers, intervalSeconds, numbersPerTicket, rowsPerTicket) {
    const numbers = Bingo.parseNumbers(inputNumbers, numbersPerTicket);
    this.initDOM();
    this.strip = new Strip(this, numbers, rowsPerTicket);
    this.caller = new Caller(this, intervalSeconds);
  }

  initDOM() {
    this.$el = $('<div id="bingo" />');
    $('body').append(this.$el);
  }

  // This method scrutinises the incoming data so we don't have to be so fastidious later on
  static parseNumbers(numbers, perTicket) {
    // Sanity check - does the input even at a glance correspond with what we're trying to parse?
    if (numbers.length * 2 % perTicket !== 0) {
      throw new Error(
      'Bingo.parseNumbers: amount of input numbers is not wholly divisible by ' +
      perTicket);

    }
    const parsed = numbers.match(/\d{2}/g).map(n => parseInt(n, 10)),
    output = [];
    while (parsed.length > 0) {
      output.push(parsed.splice(0, perTicket));
    }
    // Do ticket arrays fall within the numeric bounds we require?
    output.forEach(ticket => {
      if (!ticket.every(number => number > 0 && number <= 90)) {
        throw new RangeError(
        'Bingo.parseNumbers: parsed tickets contain invalid numbers');

      }
    });
    return output;
  }}


class Strip {
  constructor(game, numbers, rowsPerTicket) {
    this.game = game;
    this.tickets = [];
    this.initDOM();

    for (let t = 0; t < numbers.length; t++) {
      this.tickets.push(new Ticket(this, numbers[t], rowsPerTicket));
    }
  }

  initDOM() {
    this.$el = $('<div class="strip" />');
    this.game.$el.append(this.$el);
  }

  check(number) {
    this.tickets.forEach(ticket => {
      ticket.check(number);
    });
  }}


class Ticket {
  constructor(strip, numbers, rowsPerTicket) {
    this.strip = strip;
    this.numbers = numbers;
    this.marked = [];
    this.rowsPerTicket = rowsPerTicket;
    this.initDOM();
  }

  initDOM() {
    this.$el = $('<div class="ticket" />');
    this.$marked = $(
    '<div class="marked"><span class="to-do">to do</span></span>');

    this.$remaining = $(
    '<span class="remaining">' + this.countUnmarked() + '</span>');

    this.$marked.prepend(this.$remaining);
    this.$grid = this.initGrid();
    this.$el.append(this.$marked, this.$grid);

    this.strip.$el.append(this.$el);
  }

  initGrid() {
    const $grid = $('<table />');
    for (let r = 0; r < this.rowsPerTicket; r++) {
      $grid.append('<tr />');
    }

    // Make a copy of the numbers array, then sort it numerically
    const numbers = this.numbers.slice(0).sort((a, b) => a - b);

    const cols = [];

    // Split numbers into columns
    for (let n = 0; n < numbers.length; n++) {
      let col = Math.min(Math.floor(numbers[n] / 10), 8);
      if (!cols[col]) {
        cols[col] = [];
      }
      cols[col].push(numbers[n]);
      if (cols[col].length > this.rowsPerTicket) {
        throw new Error('Ticket#initGrid: row limit exceeded by numbers');
      }
    }

    // Add gaps into columns
    cols.forEach(col => {
      while (col.length < this.rowsPerTicket) {
        if (Math.random() >= 0.5) {
          col.push(null);
        } else {
          col.unshift(null);
        }
      }
    });

    this.$numbers = [].fill(null, 0, 90);
    cols.forEach(col => {
      col.forEach((number, index) => {
        const $number = $('<td>' + (number || ' ') + '</td>');
        $grid.
        find('tr').
        eq(index).
        append($number);
        this.$numbers[number] = $number;
      });
    });

    return $grid;
  }

  countUnmarked() {
    return this.numbers.length - this.marked.length;
  }

  check(number) {
    if (
    number &&
    this.numbers.indexOf(number) !== -1 &&
    this.marked.indexOf(number) === -1)
    {
      this.marked.push(number);
      this.$numbers[number].addClass('marked');
      this.$remaining.text(this.countUnmarked());
    }
    if (this.countUnmarked() === 0) {
      this.$el.addClass('winner');
      $('html').animate({ scrollTop: $('.ticket.winner').offset().top });

      this.strip.game.caller.callHouse();
      this.$marked.
      empty().
      removeClass('very close').
      addClass('winner').
      append('<span class="win">Winner</span>');
    } else if (this.countUnmarked() < this.numbers.length * 0.2) {
      this.$marked.addClass('very');
    } else if (this.countUnmarked() < this.numbers.length * 0.4) {
      this.$marked.addClass('close');
    }
  }}


class Caller {
  constructor(game, intervalSeconds) {
    this.game = game;

    this.balls = [];
    for (let n = 1; n <= 90; n++) {
      this.balls.push(n);
    }

    this.balls = Caller.shuffle(this.balls);

    this.initDOM();

    this.intervalSeconds = intervalSeconds;
    this.interval = setInterval(
    this.selectNumber.bind(this),
    intervalSeconds * 1000);

  }

  selectNumber() {
    if (this.balls.length) {
      this.callNumber(this.balls.shift());
    } else {
      clearInterval(this.interval);
      throw new Error('Caller#selectNumber: no more balls!');
    }
  }

  callNumber(number) {
    const $number =
    '<div class="number"><div class="ball ' +
    Caller.getBallColour(number) +
    '">' +
    number +
    '</div></div>';
    this.$el.append($number);
    const $numbers = this.$el.find('.number');
    if ($numbers.length > 5) {
      $numbers.first().remove();
    }
    this.game.strip.check(number);
  }

  callHouse() {
    clearInterval(this.interval);
    this.$el.append('<div class="house">House!</div>');
  }

  initDOM() {
    this.$el = $('<div class="caller" />');
    this.game.$el.append(this.$el);
  }

  // Fisher-Yates unbiased shuffling algorithm from here: https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
  static shuffle(array) {
    var currentIndex = array.length,
    temporaryValue,
    randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      // And swap it with the current element.
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }

    return array;
  }

  static getBallColour(number) {
    const color = number % 5;
    switch (color) {
      case 1:
        return 'red';
      case 2:
        return 'yellow';
      case 3:
        return 'green';
      case 4:
        return 'pink';}

  }}


const bingo = new Bingo(
inputNumbers,
intervalSeconds,
numbersPerTicket,
rowsPerTicket);