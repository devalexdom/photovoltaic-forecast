'use strict';

class PhotovoltaicForecast_Forecast {
  constructor(nextDaysPvGeneration, forecastLocation) {
    const nextDaysPvGenerationValues = Object.values(nextDaysPvGeneration);
    this.forecastDate = new Date();
    this.forecastLocation = forecastLocation;
    this.todayPvGenerationPercentAvg = nextDaysPvGenerationValues[0].pvGenerationPercentAvg;
    this.todayPvGenerationPercentPerHours = nextDaysPvGenerationValues[0].pvGenerationPercentPerHours;
    this.tomorrowPvGenerationPercentAvg = nextDaysPvGenerationValues[1].pvGenerationPercentAvg;
    this.tomorrowPvGenerationPercentPerHours = nextDaysPvGenerationValues[1].pvGenerationPercentPerHours;
    this.nextDaysPvGeneration = nextDaysPvGeneration;
  }

  getNextPvGenerationDay() {
    const now = new Date().getTime();

    for (const pvForecastDay of Object.values(this.nextDaysPvGeneration)) {
      if (now < pvForecastDay.sunrise.getTime()) {
        return pvForecastDay;
      }
    }

    return null;
  }

}
class PhotovoltaicForecast_ForecastLocation {
  constructor(weatherApiLocationData) {
    this.location = `${weatherApiLocationData["name"]}, ${weatherApiLocationData["region"]}, ${weatherApiLocationData["country"]}`;
    this.coordinates = {
      lat: weatherApiLocationData["lat"],
      lon: weatherApiLocationData["lon"]
    };
    this.timezone = weatherApiLocationData["tz_id"];
  }

}
class PhotovoltaicForecast_DayForecast {
  constructor(date, pvGenerationPercentPerHours, sunTime) {
    const totalSunTimeHours = this.getTotalSunTimeHoursCount(sunTime);
    this.date = date;
    this.pvGenerationPercentPerHours = pvGenerationPercentPerHours;
    this.pvGenerationPercentAvg = this.getDayPvGenerationPercentAvg(pvGenerationPercentPerHours);
    this.peakSunHoursPvGenerationPercentAvg = this.getPeakSunHoursPvGenerationPercentAvg(pvGenerationPercentPerHours, totalSunTimeHours);
    this.sunrise = sunTime.sunrise;
    this.sunset = sunTime.sunset;
    this.totalSunTimeHours = totalSunTimeHours;
  }

  getDayPvGenerationPercentAvg(pvGenerationPercentPerHours) {
    const pvGenerationPercentPerHoursValues = Object.values(pvGenerationPercentPerHours).filter(value => value >= 5);
    return parseFloat((pvGenerationPercentPerHoursValues.reduce((pvGenerationPercentAcc, pvGenerationPercentPerHourValue) => {
      return pvGenerationPercentAcc += pvGenerationPercentPerHourValue;
    }, 0) / pvGenerationPercentPerHoursValues.length).toPrecision(4));
  }

  getTotalSunTimeHoursCount(sunTime) {
    return parseFloat(((sunTime.sunset.getTime() - sunTime.sunrise.getTime()) / (1000 * 60 * 60)).toPrecision(4));
  }

  getPeakSunHoursPvGenerationPercentAvg(pvGenerationPercentPerHours, totalSunTimeHours) {
    const peakHoursNumber = Math.floor(totalSunTimeHours / 2.5);
    const sunTimeHours = Object.values(pvGenerationPercentPerHours).filter(hour => hour > 0);
    const middleHourPos = Math.floor(sunTimeHours.length / 2);
    const startHourPos = Math.max(0, Math.min(Math.floor(middleHourPos - peakHoursNumber / 2), sunTimeHours.length - peakHoursNumber));
    const peakSunTimeHours = sunTimeHours.slice(startHourPos, startHourPos + peakHoursNumber);
    return parseFloat((peakSunTimeHours.reduce((acc, value) => {
      return acc + value;
    }, 0) / peakSunTimeHours.length).toPrecision(4));
  }

}

const fetch = require("node-fetch");

const PhotovoltaicForecast = function ({
  location = "Barcelona, Catalonia, Spain",
  pvForecastUpdateInterval = 0,
  newPvForecastCallback,
  errorCallback,
  pvForecastDays = 3,
  apiKey = ""
}) {
  const version = 0.05;
  let parameters = {
    location,
    pvForecastUpdateInterval,
    newPvForecastCallback,
    errorCallback,
    pvForecastDays,
    apiKey
  };
  let timeZoneOffset = 0;
  let pvForecastInterval = null;
  let lastPvForecast = null;

  const setLocation = newLocation => {
    parameters = Object.assign(Object.assign({}, parameters), {
      location: newLocation
    });
  };

  const setTimeZoneOffset = newTimeZoneOffset => {
    timeZoneOffset = newTimeZoneOffset;
  };

  const setPvForecastUpdateInterval = newPvForecastUpdateInterval => {
    parameters = Object.assign(Object.assign({}, parameters), {
      pvForecastUpdateInterval: newPvForecastUpdateInterval
    });
  };

  const getTimeZoneOffsetFromTimeZoneString = timeZoneString => {
    const hereDate = new Date();
    hereDate.setMilliseconds(0);
    const hereOffsetHrs = hereDate.getTimezoneOffset() / 60 * -1,
          thereLocaleStr = hereDate.toLocaleString('en-US', {
      timeZone: timeZoneString
    }),
          thereDate = new Date(thereLocaleStr),
          diffHrs = (thereDate.getTime() - hereDate.getTime()) / 1000 / 60 / 60,
          thereOffsetHrs = hereOffsetHrs + diffHrs;
    return thereOffsetHrs;
  };

  const getDataFromWeatherApi = () => {
    return fetch(`http://api.weatherapi.com/v1/forecast.json?q=${parameters.location}&days=${parameters.pvForecastDays}&key=${parameters.apiKey}`).then(response => response.json());
  };

  const doForecastNow = () => {
    return new Promise((resolve, reject) => {
      if (!parameters.apiKey) {
        reject();
        return;
      }

      getDataFromWeatherApi().then(data => {
        resolve(processData(data));
      }).catch(error => {
        reject({
          message: `Photovoltaic Forecast v${version} error:`,
          errorData: error
        });
      });
    });
  };

  const to24Hour = time => {
    const get12HourStringRemoved = time => time.replace(/(AM|PM|\s)/g, '');

    const hoursStr = time.slice(0, 2);
    const hours = parseInt(hoursStr);

    if (time.indexOf('AM') !== -1 && hours === 12) {
      return get12HourStringRemoved(time.replace('12', '0'));
    }

    if (time.indexOf('PM') !== -1 && hours < 12) {
      return get12HourStringRemoved(time.replace(hoursStr, `${hours + 12}`));
    }

    return get12HourStringRemoved(time);
  };

  const nonISODateStringToDate = nonISODate => {
    return new Date(`${nonISODate} ${getUTCString(timeZoneOffset)}`);
  };

  const getUTCString = timezoneOffset => {
    const sign = timezoneOffset > 0 ? "+" : "-";
    return `UTC${sign}${timezoneOffset}`;
  };

  const getSunTime = dayForecast => {
    return {
      sunrise: new Date(`${dayForecast["date"]} ${to24Hour(dayForecast["astro"]["sunrise"])} ${getUTCString(timeZoneOffset)}`),
      sunset: new Date(`${dayForecast["date"]} ${to24Hour(dayForecast["astro"]["sunset"])} ${getUTCString(timeZoneOffset)}`)
    };
  };

  const isDayLightTime = (dayHourForecastDate, dayForecast) => {
    const daySunTime = getSunTime(dayForecast);
    const dayHourForecastTimeInMs = dayHourForecastDate.getTime();
    const sunriseHour = new Date(daySunTime.sunrise);
    sunriseHour.setHours(sunriseHour.getHours(), 0, 0, 0);
    return dayHourForecastTimeInMs >= sunriseHour.getTime() && dayHourForecastTimeInMs <= daySunTime.sunset.getTime();
  };

  const getMappedSunHoursDayForecast = dayForecast => {
    return dayForecast["hour"].reduce((keyValueDayHourForecast, dayHourForecast) => {
      const dayHourForecastDate = nonISODateStringToDate(dayHourForecast["time"]);
      const key = dayHourForecastDate.toISOString();

      if (!isDayLightTime(dayHourForecastDate, dayForecast)) {
        keyValueDayHourForecast[key] = 0;
        return keyValueDayHourForecast;
      }

      const visibilityFactor = dayHourForecast["vis_km"] < 10 ? 100 / dayHourForecast["vis_km"] / 3 : 0;
      const sunPercent = 100 - dayHourForecast["cloud"] - visibilityFactor;
      keyValueDayHourForecast[key] = sunPercent < 5 ? 5 : sunPercent;
      return keyValueDayHourForecast;
    }, {});
  };

  const processData = weatherApiForecastData => {
    if (weatherApiForecastData["error"]) {
      throw weatherApiForecastData["error"];
    }

    setTimeZoneOffset(getTimeZoneOffsetFromTimeZoneString(weatherApiForecastData["location"]["tz_id"]));
    const nextDaysForecast = weatherApiForecastData["forecast"]["forecastday"];
    const nextDaysPvGeneration = nextDaysForecast.reduce((keyValueDayForecast, dayForecast) => {
      const daySunTime = getSunTime(dayForecast);
      const pvGenerationPercentPerHours = getMappedSunHoursDayForecast(dayForecast);
      const dayDate = new Date(`${dayForecast["date"]} ${getUTCString(timeZoneOffset)}`);
      keyValueDayForecast[dayDate.toISOString()] = new PhotovoltaicForecast_DayForecast(dayDate, pvGenerationPercentPerHours, daySunTime);
      return keyValueDayForecast;
    }, {});
    const forecastLocation = new PhotovoltaicForecast_ForecastLocation(weatherApiForecastData["location"]);
    const pvForecast = new PhotovoltaicForecast_Forecast(nextDaysPvGeneration, forecastLocation);
    lastPvForecast = pvForecast;
    return pvForecast;
  };

  const handleForecast = () => {
    doForecastNow().then(pvForecast => {
      if (parameters.newPvForecastCallback) parameters.newPvForecastCallback(pvForecast);
    }).catch(error => {
      if (parameters.errorCallback) parameters.errorCallback(error);
    });
  };

  const initAutomatedForecast = () => {
    if (parameters.pvForecastUpdateInterval && !pvForecastInterval) {
      handleForecast();
      pvForecastInterval = setInterval(handleForecast, parameters.pvForecastUpdateInterval * 1000);
      return true;
    }

    return false;
  };

  const getLastPvForecast = () => lastPvForecast;

  const stopAutomatedForecast = () => {
    clearInterval(pvForecastInterval);
    pvForecastInterval = null;
    return true;
  };

  const getVersion = () => version;

  if (!parameters.apiKey) {
    const errorMessage = `Photovoltaic Forecast v${version} error: missing weatherapi.com api key`;
    console.error(errorMessage);
    if (parameters.errorCallback) parameters.errorCallback({
      message: errorMessage
    });
  }

  initAutomatedForecast();
  return {
    getVersion,
    setNewLocation: setLocation,
    setNewPvForecastUpdateInterval: setPvForecastUpdateInterval,
    initAutomatedForecast,
    stopAutomatedForecast,
    getLastPvForecast,
    getPvForecastNow: doForecastNow
  };
};

module.exports = PhotovoltaicForecast;
