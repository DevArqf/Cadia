const { Time } = require('@sapphire/time-utilities');

/**
 * Converts a number of seconds to milliseconds.
 * @param {number} seconds The amount of seconds
 * @returns The amount of milliseconds `seconds` equals to.
 */
function seconds(seconds) {
	return seconds * Time.Second;
}

/**
 * Converts a number of minutes to milliseconds.
 * @param {number} minutes The amount of minutes
 * @returns The amount of milliseconds `minutes` equals to.
 */
function minutes(minutes) {
	return minutes * Time.Minute;
}

/**
 * Converts a number of hours to milliseconds.
 * @param {number} hours The amount of hours
 * @returns The amount of milliseconds `hours` equals to.
 */
function hours(hours) {
	return hours * Time.Hour;
}

/**
 * Converts a number of days to milliseconds.
 * @param {number} days The amount of days
 * @returns The amount of milliseconds `days` equals to.
 */
function days(days) {
	return days * Time.Day;
}

/**
 * Converts a number of months to milliseconds.
 * @param {number} months The amount of months
 * @returns The amount of milliseconds `months` equals to.
 */
function months(months) {
	return months * Time.Month;
}

/**
 * Converts a number of years to milliseconds.
 * @param {number} years The amount of years
 * @returns The amount of milliseconds `years` equals to.
 */
function years(years) {
	return years * Time.Year;
}

module.exports = {
	seconds,
	minutes,
	hours,
	days,
	months,
	years
};
