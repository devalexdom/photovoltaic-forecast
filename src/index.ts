const fetch = require("node-fetch");

interface PhotovoltaicForecast_Parameters {
  location: string,
  pvForecastUpdateInterval?: number;
  newPvForecastCallback?: (forecast: PhotovoltaicForecast_Forecast) => any;
  errorCallback?: (error: PhotovoltaicForecast_Error) => any;
  pvForecastDays?: number;
  apiKey: string;
}

interface PhotovoltaicForecast_Methods {
  getVersion: () => number;
  setNewLocation: (newLocation: string) => void;
  setNewpvForecastUpdateInterval: (newPvForecastUpdateInterval: number) => void;
  initAutomatedForecast: () => boolean;
  stopAutomatedForecast: () => boolean;
  getLastPvForecast: () => PhotovoltaicForecast_Forecast;
  getPvForecastNow: () => Promise<PhotovoltaicForecast_Forecast>;
}

interface PhotovoltaicForecast_Error {
  message: string;
  errorData?: any;
}

type SunTime = {
  sunrise: Date,
  sunset: Date
};

const PhotovoltaicForecast = function ({ location = "Barcelona, Catalonia, Spain", pvForecastUpdateInterval = 0, newPvForecastCallback, errorCallback, pvForecastDays = 3, apiKey = "" }: PhotovoltaicForecast_Parameters): PhotovoltaicForecast_Methods {
  const version = 0.01;
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
    parameters = { ...parameters, ...{ location: newLocation } };
  }

  const setNewpvForecastUpdateInterval = (newPvForecastUpdateInterval: number): void => {
    parameters = { ...parameters, ...{ pvForecastUpdateInterval: newPvForecastUpdateInterval } };
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
    const hoursStr = time.slice(0, 2);
    const hours = parseInt(hoursStr);
    if (time.indexOf('AM') != -1 && hours == 12) {
      time = time.replace('12', '0');
    }
    if (time.indexOf('PM') != -1 && hours < 12) {
      time = time.replace(hoursStr, `${hours + 12}`);
    }
    return time.replace(/(AM|PM|\s)/g, '');
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

  const getSunHoursDayForecast = (dayForecast: Object) => {
    const daySunTime = getSunTime(dayForecast);
    const forecastByHours = dayForecast["hour"];
    return forecastByHours.filter((hourForecast) => {
      const forecastTimeInMs = nonISODateStringToDate(hourForecast["time"]).getTime();
      const sunriseHour = new Date(daySunTime.sunrise);
      sunriseHour.setHours(sunriseHour.getHours(), 0, 0, 0);
      return (forecastTimeInMs >= sunriseHour.getTime() && forecastTimeInMs <= daySunTime.sunset.getTime())
    });
  }

  const getMappedSunHoursDayForecast = (dayForecast: Array<Object>) => {
    return dayForecast.reduce<Record<string, number>>((keyValueDayHourForecast, dayHourForecast) => {
      const key = nonISODateStringToDate(dayHourForecast["time"]).toISOString();
      keyValueDayHourForecast[key] = 100 - dayHourForecast["cloud"];
      return keyValueDayHourForecast;
    }, {});
  }

  const processData = (weatherApiForecastData: Object): PhotovoltaicForecast_Forecast => {
    const nextDaysForecast = weatherApiForecastData["forecast"]["forecastday"];
    const nextDaysPvGeneration = nextDaysForecast.reduce<Record<string, number>>((keyValueDayForecast, dayForecast) => {
      const daySunTime = getSunTime(dayForecast);
      const pvGenerationPercentPerHours = getMappedSunHoursDayForecast(getSunHoursDayForecast(dayForecast));
      const key = new Date(dayForecast["date"]).toISOString();
      keyValueDayForecast[key] = new PhotovoltaicForecast_DayForecast(pvGenerationPercentPerHours, daySunTime);
      return keyValueDayForecast;
    }, {})

    const pvForecast = new PhotovoltaicForecast_Forecast(nextDaysPvGeneration);
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
    setNewpvForecastUpdateInterval,
    initAutomatedForecast,
    stopAutomatedForecast,
    getLastPvForecast,
    getPvForecastNow: doForecastNow
  }
};



class PhotovoltaicForecast_DayForecast {
  pvGenerationPercentAvg: number;
  pvGenerationPercentPerHours: { [key: string]: number };
  totalSunTimeHours: number;
  sunrise: Date;
  sunset: Date;
  constructor(pvGenerationPercentPerHours: { [key: string]: number }, sunTime: SunTime) {
    this.pvGenerationPercentPerHours = pvGenerationPercentPerHours;
    this.pvGenerationPercentAvg = this.getDayPhotovoltaicGenerationPercentAvg(pvGenerationPercentPerHours);
    this.sunrise = sunTime.sunrise;
    this.sunset = sunTime.sunset;
    this.totalSunTimeHours = parseFloat(((this.sunset.getTime() - this.sunrise.getTime()) / (1000 * 60 * 60)).toPrecision(4));
  }

  getDayPhotovoltaicGenerationPercentAvg(dayHoursForecastPercent: { [key: string]: number }) {
    const dayHoursForecastPercentValues = Object.values(dayHoursForecastPercent);
    return parseFloat((dayHoursForecastPercentValues.reduce((photovoltaicGenerationPercentAcc, dayHoursForecastPercentValue) => {
      return photovoltaicGenerationPercentAcc += dayHoursForecastPercentValue;
    }, 0) / dayHoursForecastPercentValues.length).toPrecision(4));
  }
}

class PhotovoltaicForecast_Forecast {
  forecastDate: Date;
  todayPvGenerationPercentAvg: number;
  todayPvGenerationPercentPerHours: { [key: string]: number };
  tomorrowPvGenerationPercentAvg: number;
  tomorrowPvGenerationPercentPerHours: { [key: string]: number };
  nextDaysPvGeneration: { [key: string]: PhotovoltaicForecast_DayForecast };
  constructor(nextDaysPvGeneration: { [key: string]: PhotovoltaicForecast_DayForecast }) {
    const nextDaysPvGenerationValues = Object.values(nextDaysPvGeneration);
    this.forecastDate = new Date();
    this.todayPvGenerationPercentAvg = nextDaysPvGenerationValues[0].pvGenerationPercentAvg;
    this.todayPvGenerationPercentPerHours = nextDaysPvGenerationValues[0].pvGenerationPercentPerHours;
    this.tomorrowPvGenerationPercentAvg = nextDaysPvGenerationValues[1].pvGenerationPercentAvg;
    this.tomorrowPvGenerationPercentPerHours = nextDaysPvGenerationValues[1].pvGenerationPercentPerHours;
    this.nextDaysPvGeneration = nextDaysPvGeneration;
  }
}

export default PhotovoltaicForecast;