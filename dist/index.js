'use strict';

const fetch = require("node-fetch");

const PhotovoltaicForecast = function ({
  location = "Barcelona, Catalonia, Spain",
  pvForecastUpdateInterval = 0,
  newPvForecastCallback,
  errorCallback,
  pvForecastDays = 3,
  apiKey = ""
}) {
  const version = 0.01;
  let parameters = {
    location,
    pvForecastUpdateInterval,
    newPvForecastCallback,
    errorCallback,
    pvForecastDays,
    apiKey
  };
  let pvForecastInterval = null;
  let lastPvForecast = null;

  const setNewLocation = newLocation => {
    parameters = Object.assign(Object.assign({}, parameters), {
      location: newLocation
    });
  };

  const setNewPvForecastUpdateInterval = newPvForecastUpdateInterval => {
    parameters = Object.assign(Object.assign({}, parameters), {
      pvForecastUpdateInterval: newPvForecastUpdateInterval
    });
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
    const hoursStr = time.slice(0, 2);
    const hours = parseInt(hoursStr);

    if (time.indexOf('AM') != -1 && hours == 12) {
      time = time.replace('12', '0');
    }

    if (time.indexOf('PM') != -1 && hours < 12) {
      time = time.replace(hoursStr, `${hours + 12}`);
    }

    return time.replace(/(AM|PM|\s)/g, '');
  };

  const nonISODateStringToDate = nonISODate => {
    return new Date(`${nonISODate.replace(' ', 'T')}:00Z`);
  };

  const getSunTime = dayForecast => {
    return {
      sunrise: new Date(`${dayForecast["date"]}T${to24Hour(dayForecast["astro"]["sunrise"])}:00Z`),
      sunset: new Date(`${dayForecast["date"]}T${to24Hour(dayForecast["astro"]["sunset"])}:00Z`)
    };
  };

  const isSunHour = (dayHourForecastDate, dayForecast) => {
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

      if (!isSunHour(dayHourForecastDate, dayForecast)) {
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

    const nextDaysForecast = weatherApiForecastData["forecast"]["forecastday"];
    const nextDaysPvGeneration = nextDaysForecast.reduce((keyValueDayForecast, dayForecast) => {
      const daySunTime = getSunTime(dayForecast);
      const pvGenerationPercentPerHours = getMappedSunHoursDayForecast(dayForecast);
      const key = new Date(dayForecast["date"]).toISOString();
      keyValueDayForecast[key] = new PhotovoltaicForecast_DayForecast(pvGenerationPercentPerHours, daySunTime);
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
    setNewLocation,
    setNewPvForecastUpdateInterval,
    initAutomatedForecast,
    stopAutomatedForecast,
    getLastPvForecast,
    getPvForecastNow: doForecastNow
  };
};

class PhotovoltaicForecast_DayForecast {
  constructor(pvGenerationPercentPerHours, sunTime) {
    this.pvGenerationPercentPerHours = pvGenerationPercentPerHours;
    this.pvGenerationPercentAvg = this.getDayPhotovoltaicGenerationPercentAvg(pvGenerationPercentPerHours);
    this.sunrise = sunTime.sunrise;
    this.sunset = sunTime.sunset;
    this.totalSunTimeHours = parseFloat(((this.sunset.getTime() - this.sunrise.getTime()) / (1000 * 60 * 60)).toPrecision(4));
  }

  getDayPhotovoltaicGenerationPercentAvg(dayHoursForecastPercent) {
    const dayHoursForecastPercentValues = Object.values(dayHoursForecastPercent).filter(value => value >= 5);
    return parseFloat((dayHoursForecastPercentValues.reduce((photovoltaicGenerationPercentAcc, dayHoursForecastPercentValue) => {
      return photovoltaicGenerationPercentAcc += dayHoursForecastPercentValue;
    }, 0) / dayHoursForecastPercentValues.length).toPrecision(4));
  }

}

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

module.exports = PhotovoltaicForecast;
