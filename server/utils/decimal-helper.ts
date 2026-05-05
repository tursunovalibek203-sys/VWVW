import Decimal from 'decimal.js';

/**
 * Pul hisoblashlarida precision xatolarini oldini olish uchun
 * Decimal.js yordamida aniq hisoblash
 */

// Decimal konfiguratsiyasi
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export class MoneyCalculator {
  /**
   * Ikkita summani qo'shish
   */
  static add(a: number | string, b: number | string): number {
    return new Decimal(a).plus(new Decimal(b)).toNumber();
  }

  /**
   * Ayirish
   */
  static subtract(a: number | string, b: number | string): number {
    return new Decimal(a).minus(new Decimal(b)).toNumber();
  }

  /**
   * Ko'paytirish
   */
  static multiply(a: number | string, b: number | string): number {
    return new Decimal(a).times(new Decimal(b)).toNumber();
  }

  /**
   * Bo'lish
   */
  static divide(a: number | string, b: number | string): number {
    if (new Decimal(b).isZero()) {
      throw new Error('Cannot divide by zero');
    }
    return new Decimal(a).dividedBy(new Decimal(b)).toNumber();
  }

  /**
   * 2 kasr bilan yaxlitlash (pul uchun)
   */
  static round(value: number | string, decimals: number = 2): number {
    return new Decimal(value).toDecimalPlaces(decimals).toNumber();
  }

  /**
   * Valyuta konvertatsiyasi
   */
  static convertCurrency(
    amount: number | string,
    rate: number | string
  ): number {
    return this.round(this.multiply(amount, rate));
  }

  /**
   * Foizni hisoblash
   */
  static calculatePercentage(
    amount: number | string,
    percentage: number | string
  ): number {
    return this.round(this.multiply(amount, this.divide(percentage, 100)));
  }

  /**
   * Chegirmani hisoblash
   */
  static applyDiscount(
    amount: number | string,
    discountPercent: number | string
  ): number {
    const discount = this.calculatePercentage(amount, discountPercent);
    return this.round(this.subtract(amount, discount));
  }

  /**
   * Summalarni yig'ish (array)
   */
  static sum(amounts: number[]): number {
    return amounts.reduce(
      (total, amount) => this.add(total, amount),
      0
    );
  }

  /**
   * Taqqoslash (a > b)
   */
  static isGreaterThan(a: number | string, b: number | string): boolean {
    return new Decimal(a).greaterThan(new Decimal(b));
  }

  /**
   * Taqqoslash (a >= b)
   */
  static isGreaterThanOrEqual(a: number | string, b: number | string): boolean {
    return new Decimal(a).greaterThanOrEqualTo(new Decimal(b));
  }

  /**
   * Taqqoslash (a < b)
   */
  static isLessThan(a: number | string, b: number | string): boolean {
    return new Decimal(a).lessThan(new Decimal(b));
  }

  /**
   * Taqqoslash (a === b)
   */
  static isEqual(a: number | string, b: number | string): boolean {
    return new Decimal(a).equals(new Decimal(b));
  }

  /**
   * Format qilish (2 kasr bilan)
   */
  static format(value: number | string, decimals: number = 2): string {
    return new Decimal(value).toFixed(decimals);
  }

  /**
   * Get minimum of two numbers
   */
  static min(a: number | string, b: number | string): number {
    return new Decimal(a).lessThan(new Decimal(b)) ? new Decimal(a).toNumber() : new Decimal(b).toNumber();
  }

  /**
   * Get maximum of two numbers
   */
  static max(a: number | string, b: number | string): number {
    return new Decimal(a).greaterThan(new Decimal(b)) ? new Decimal(a).toNumber() : new Decimal(b).toNumber();
  }
}

// Export qisqa funksiyalar
export const { add, subtract, multiply, divide, round, convertCurrency, sum } = MoneyCalculator;

// Export as DecimalHelper for backward compatibility
export const DecimalHelper = MoneyCalculator;
