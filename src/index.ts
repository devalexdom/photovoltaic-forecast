import {
  PhotovoltaicForecast_Forecast, PhotovoltaicForecast_Methods, PhotovoltaicForecast_Parameters,
  PhotovoltaicForecast_ForecastLocation, PhotovoltaicForecast_DayForecast, PhotovoltaicForecast_Error,
  SunTime
} from "./types";

const fetch = require("node-fetch");

const PhotovoltaicForecast = function ({ location = "Barcelona, Catalonia, Spain", pvForecastUpdateInterval = 0, newPvForecastCallback, errorCallback, pvForecastDays = 3, apiKey = "" }: PhotovoltaicForecast_Parameters): PhotovoltaicForecast_Methods {
  const version = 0.02;
  let parameters: PhotovoltaicForecast_Parameters = {
    location,
    pvForecastUpdateInterval,
    newPvForecastCallback,
    errorCallback,
    pvForecastDays,
    apiKey
  };

  let pvForecastInterval: NodeJS.Timeout = null;
  let lastPvForecast: PhotovoltaicForecast_Forecast = null;

  const setNewLocation = (newLocation: string): void => {
    parameters = { ...parameters, location: newLocation };
  }

  const setNewPvForecastUpdateInterval = (newPvForecastUpdateInterval: number): void => {
    parameters = { ...parameters, pvForecastUpdateInterval: newPvForecastUpdateInterval };
  }

  const getDataFromWeatherApi = () => {
    return fetch(`http://api.weatherapi.com/v1/forecast.json?q=${parameters.location}&days=${parameters.pvForecastDays}&key=${parameters.apiKey}`)
      .then(response => response.json())
  }

  const doForecastNow = () => {
    return new Promise<PhotovoltaicForecast_Forecast>((resolve, reject) => {
      if (!parameters.apiKey) {
        reject();
        return;
      }

      getDataFromWeatherApi()
        .then(data => {
          resolve(processData(data));
        })
        .catch((error) => {
          reject({
            message: `Photovoltaic Forecast v${version} error:`,
            errorData: error
          } as PhotovoltaicForecast_Error)
        });
    });
  }

  const to24Hour = (time: string) => {
    const get12HourStringRemoved = (time) => time.replace(/(AM|PM|\s)/g, '');
    const hoursStr = time.slice(0, 2);
    const hours = parseInt(hoursStr);

    if (time.indexOf('AM') !== -1 && hours === 12) {
      return get12HourStringRemoved(time.replace('12', '0'))
    }
    if (time.indexOf('PM') !== -1 && hours < 12) {
      return get12HourStringRemoved(time.replace(hoursStr, `${hours + 12}`));
    }
    return get12HourStringRemoved(time);
  }

  const nonISODateStringToDate = (nonISODate: string): Date => {
    return new Date(`${nonISODate.replace(' ', 'T')}:00Z`)
  }

  const getSunTime = (dayForecast): SunTime => {
    return {
      sunrise: new Date(`${dayForecast["date"]}T${to24Hour(dayForecast["astro"]["sunrise"])}:00Z`),
      sunset: new Date(`${dayForecast["date"]}T${to24Hour(dayForecast["astro"]["sunset"])}:00Z`),
    };
  }

  const isDayLightTime = (dayHourForecastDate: Date, dayForecast: Object) => {
    const daySunTime = getSunTime(dayForecast);
    const dayHourForecastTimeInMs = dayHourForecastDate.getTime();
    const sunriseHour = new Date(daySunTime.sunrise);
    sunriseHour.setHours(sunriseHour.getHours(), 0, 0, 0);
    return (dayHourForecastTimeInMs >= sunriseHour.getTime() && dayHourForecastTimeInMs <= daySunTime.sunset.getTime())
  }

  const getMappedSunHoursDayForecast = (dayForecast: Array<Object>) => {
    return dayForecast["hour"].reduce<Record<string, number>>((keyValueDayHourForecast, dayHourForecast) => {
      const dayHourForecastDate = nonISODateStringToDate(dayHourForecast["time"]);
      const key = dayHourForecastDate.toISOString();

      if (!isDayLightTime(dayHourForecastDate, dayForecast)) {
        keyValueDayHourForecast[key] = 0;
        return keyValueDayHourForecast;
      }

      const visibilityFactor = (dayHourForecast["vis_km"] < 10 ? ((100 / dayHourForecast["vis_km"]) / 3) : 0);
      const sunPercent = 100 - dayHourForecast["cloud"] - visibilityFactor;

      keyValueDayHourForecast[key] = sunPercent < 5 ? 5 : sunPercent;
      return keyValueDayHourForecast;
    }, {});
  }

  const processData = (weatherApiForecastData: Object): PhotovoltaicForecast_Forecast => {
    if (weatherApiForecastData["error"]) {
      throw weatherApiForecastData["error"];
    }

    const nextDaysForecast = weatherApiForecastData["forecast"]["forecastday"];
    const nextDaysPvGeneration = nextDaysForecast.reduce<Record<string, number>>((keyValueDayForecast, dayForecast) => {
      const daySunTime = getSunTime(dayForecast);
      const pvGenerationPercentPerHours = getMappedSunHoursDayForecast(dayForecast);
      const dayDate = new Date(dayForecast["date"]);
      keyValueDayForecast[dayDate.toISOString()] = new PhotovoltaicForecast_DayForecast(dayDate, pvGenerationPercentPerHours, daySunTime);
      return keyValueDayForecast;
    }, {});

    const forecastLocation = new PhotovoltaicForecast_ForecastLocation(weatherApiForecastData["location"]);
    const pvForecast = new PhotovoltaicForecast_Forecast(nextDaysPvGeneration, forecastLocation);
    lastPvForecast = pvForecast;
    return pvForecast;
  }

  const handleForecast = (): void => {
    doForecastNow().then(pvForecast => {
      if (parameters.newPvForecastCallback) parameters.newPvForecastCallback(pvForecast);
    }).catch((error) => {
      if (parameters.errorCallback) parameters.errorCallback(error);
    });
  }

  const initAutomatedForecast = (): boolean => {
    if (parameters.pvForecastUpdateInterval && !pvForecastInterval) {
      handleForecast();
      pvForecastInterval = setInterval(handleForecast, parameters.pvForecastUpdateInterval * 1000);
      return true;
    }
    return false;
  }

  const getLastPvForecast = (): PhotovoltaicForecast_Forecast => lastPvForecast;

  const stopAutomatedForecast = (): boolean => {
    clearInterval(pvForecastInterval);
    pvForecastInterval = null;
    return true;
  }

  const getVersion = (): number => version;

  if (!parameters.apiKey) {
    const errorMessage = `Photovoltaic Forecast v${version} error: missing weatherapi.com api key`;
    console.error(errorMessage);
    if (parameters.errorCallback) parameters.errorCallback({ message: errorMessage });
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
  }
};

export default PhotovoltaicForecast;