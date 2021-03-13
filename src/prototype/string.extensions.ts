/* eslint-disable @typescript-eslint/no-unused-vars */
interface String {
  format(...args: string[]): string;
}

String.prototype.format = function (...args: string[]): string {
  return this.replace(/{(\d+)}/g, function (match: string, number: number) {
    return typeof args[number] != 'undefined' ? args[number] : match;
  });
};
