

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
    pvGenerationPercentPerHours: { [key: string]: number };
    pvGenerationPercentAvg: number;
    peakSunHoursPvGenerationPercentAvg: number;
    totalSunTimeHours: number;
    sunrise: Date;
    sunset: Date;
    constructor(date: Date, pvGenerationPercentPerHours: { [key: string]: number }, sunTime: SunTime) {
        const totalSunTimeHours = this.getTotalSunTimeHoursCount(sunTime);
        this.date = date;
        this.pvGenerationPercentPerHours = pvGenerationPercentPerHours;
        this.pvGenerationPercentAvg = this.getDayPvGenerationPercentAvg(pvGenerationPercentPerHours);
        this.peakSunHoursPvGenerationPercentAvg = this.getPeakSunHoursPvGenerationPercentAvg(pvGenerationPercentPerHours, totalSunTimeHours);
        this.sunrise = sunTime.sunrise;
        this.sunset = sunTime.sunset;
        this.totalSunTimeHours = totalSunTimeHours;
    }

    private getDayPvGenerationPercentAvg(pvGenerationPercentPerHours: { [key: string]: number }): number {
        const pvGenerationPercentPerHoursValues = Object.values(pvGenerationPercentPerHours).filter(value => value >= 5);
        return parseFloat((pvGenerationPercentPerHoursValues.reduce((pvGenerationPercentAcc, pvGenerationPercentPerHourValue) => {
            return pvGenerationPercentAcc += pvGenerationPercentPerHourValue;
        }, 0) / pvGenerationPercentPerHoursValues.length).toPrecision(4));
    }

    private getTotalSunTimeHoursCount(sunTime: SunTime) {
        return parseFloat(((sunTime.sunset.getTime() - sunTime.sunrise.getTime()) / (1000 * 60 * 60)).toPrecision(4));
    }

    private getPeakSunHoursPvGenerationPercentAvg(pvGenerationPercentPerHours: { [key: string]: number }, totalSunTimeHours: number): number {
        const peakHoursNumber = Math.floor(totalSunTimeHours / 2.5);
        const sunTimeHours = Object.values(pvGenerationPercentPerHours).filter(hour => hour > 0);
        const middleHourPos = Math.floor(sunTimeHours.length / 2);
        const startHourPos = Math.max(0, Math.min(Math.floor(middleHourPos - peakHoursNumber / 2), sunTimeHours.length - peakHoursNumber));
        const peakSunTimeHours = sunTimeHours.slice(startHourPos, startHourPos + peakHoursNumber);

        return parseFloat((peakSunTimeHours.reduce((acc, value) => {
            return acc + value;
        }, 0) / peakSunTimeHours.length).toPrecision(4))
    }
}