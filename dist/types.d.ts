export interface coordinates {
    lat: number;
    lon: number;
}
export interface PhotovoltaicForecast_Parameters {
    location: string;
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
export declare type SunTime = {
    sunrise: Date;
    sunset: Date;
};
export declare class PhotovoltaicForecast_Forecast {
    forecastDate: Date;
    forecastLocation: PhotovoltaicForecast_ForecastLocation;
    todayPvGenerationPercentAvg: number;
    todayPvGenerationPercentPerHours: {
        [key: string]: number;
    };
    tomorrowPvGenerationPercentAvg: number;
    tomorrowPvGenerationPercentPerHours: {
        [key: string]: number;
    };
    nextDaysPvGeneration: {
        [key: string]: PhotovoltaicForecast_DayForecast;
    };
    constructor(nextDaysPvGeneration: {
        [key: string]: PhotovoltaicForecast_DayForecast;
    }, forecastLocation: PhotovoltaicForecast_ForecastLocation);
    getNextPvGenerationDay(): PhotovoltaicForecast_DayForecast;
}
export declare class PhotovoltaicForecast_ForecastLocation {
    location: string;
    coordinates: coordinates;
    timezone: string;
    constructor(weatherApiLocationData: Object);
}
export declare class PhotovoltaicForecast_DayForecast {
    date: Date;
    pvGenerationPercentPerHours: {
        [key: string]: number;
    };
    pvGenerationPercentAvg: number;
    peakSunHoursPvGenerationPercentAvg: number;
    totalSunTimeHours: number;
    sunrise: Date;
    sunset: Date;
    constructor(date: Date, pvGenerationPercentPerHours: {
        [key: string]: number;
    }, sunTime: SunTime);
    private getDayPvGenerationPercentAvg;
    private getTotalSunTimeHoursCount;
    private getPeakSunHoursPvGenerationPercentAvg;
}
