

export interface coordinates {
    lat: number;
    lon: number;
}
export interface PhotovoltaicForecast_Parameters {
    location: string,
    pvForecastUpdateInterval?: number;
    newPvForecastCallback?: (forecast: PhotovoltaicForecast_Forecast) => any;
    errorCallback?: (error: PhotovoltaicForecast_Error) => any;
    pvForecastDays?: number;
    apiKey: string;
}

export interface PhotovoltaicForecast_Methods {
    getVersion: () => number;
    setNewLocation: (newLocation: string) => void;
    setNewPvForecastUpdateInterval: (newPvForecastUpdateInterval: number) => void;
    initAutomatedForecast: () => boolean;
    stopAutomatedForecast: () => boolean;
    getLastPvForecast: () => PhotovoltaicForecast_Forecast;
    getPvForecastNow: () => Promise<PhotovoltaicForecast_Forecast>;
}

export interface PhotovoltaicForecast_Error {
    message: string;
    errorData?: any;
}

export type SunTime = {
    sunrise: Date,
    sunset: Date
};

export class PhotovoltaicForecast_Forecast {
    forecastDate: Date;
    forecastLocation: PhotovoltaicForecast_ForecastLocation;
    todayPvGenerationPercentAvg: number;
    todayPvGenerationPercentPerHours: { [key: string]: number };
    tomorrowPvGenerationPercentAvg: number;
    tomorrowPvGenerationPercentPerHours: { [key: string]: number };
    nextDaysPvGeneration: { [key: string]: PhotovoltaicForecast_DayForecast };
    constructor(nextDaysPvGeneration: { [key: string]: PhotovoltaicForecast_DayForecast }, forecastLocation: PhotovoltaicForecast_ForecastLocation) {
        const nextDaysPvGenerationValues = Object.values(nextDaysPvGeneration);
        this.forecastDate = new Date();
        this.forecastLocation = forecastLocation;
        this.todayPvGenerationPercentAvg = nextDaysPvGenerationValues[0].pvGenerationPercentAvg;
        this.todayPvGenerationPercentPerHours = nextDaysPvGenerationValues[0].pvGenerationPercentPerHours;
        this.tomorrowPvGenerationPercentAvg = nextDaysPvGenerationValues[1].pvGenerationPercentAvg;
        this.tomorrowPvGenerationPercentPerHours = nextDaysPvGenerationValues[1].pvGenerationPercentPerHours;
        this.nextDaysPvGeneration = nextDaysPvGeneration;
    }
    getNextPvGenerationDay(): PhotovoltaicForecast_DayForecast {
        const now = new Date().getTime();
        for (const pvForecastDay of Object.values(this.nextDaysPvGeneration)) {
            if (now < pvForecastDay.sunrise.getTime()) {
                return pvForecastDay;
            }
        }
        return null;
    }
}

export class PhotovoltaicForecast_ForecastLocation {
    location: string;
    coordinates: coordinates;
    timezone: string;
    constructor(weatherApiLocationData: Object) {
        this.location = `${weatherApiLocationData["name"]}, ${weatherApiLocationData["region"]}, ${weatherApiLocationData["country"]}`;
        this.coordinates = {
            lat: weatherApiLocationData["lat"],
            lon: weatherApiLocationData["lon"],
        };
        this.timezone = weatherApiLocationData["tz_id"];
    }
}

export class PhotovoltaicForecast_DayForecast {
    date: Date;
    pvGenerationPercentAvg: number;
    pvGenerationPercentPerHours: { [key: string]: number };
    totalSunTimeHours: number;
    sunrise: Date;
    sunset: Date;
    constructor(date: Date, pvGenerationPercentPerHours: { [key: string]: number }, sunTime: SunTime) {
        this.date = date;
        this.pvGenerationPercentPerHours = pvGenerationPercentPerHours;
        this.pvGenerationPercentAvg = this.getDayPhotovoltaicGenerationPercentAvg(pvGenerationPercentPerHours);
        this.sunrise = sunTime.sunrise;
        this.sunset = sunTime.sunset;
        this.totalSunTimeHours = parseFloat(((this.sunset.getTime() - this.sunrise.getTime()) / (1000 * 60 * 60)).toPrecision(4));
    }

    private getDayPhotovoltaicGenerationPercentAvg(dayHoursForecastPercent: { [key: string]: number }) {
        const dayHoursForecastPercentValues = Object.values(dayHoursForecastPercent).filter(value => value >= 5);
        return parseFloat((dayHoursForecastPercentValues.reduce((photovoltaicGenerationPercentAcc, dayHoursForecastPercentValue) => {
            return photovoltaicGenerationPercentAcc += dayHoursForecastPercentValue;
        }, 0) / dayHoursForecastPercentValues.length).toPrecision(4));
    }
}