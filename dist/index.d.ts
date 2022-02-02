interface PhotovoltaicForecast_Parameters {
    location: string;
    pvForecastUpdateInterval?: number;
    newPvForecastCallback?: (forecast: PhotovoltaicForecast_Forecast) => any;
    errorCallback?: (error: PhotovoltaicForecast_Error) => any;
    pvForecastDays?: number;
    apiKey: string;
}
interface PhotovoltaicForecast_Methods {
    getVersion: () => number;
    setNewLocation: (newLocation: string) => void;
    setNewPvForecastUpdateInterval: (newPvForecastUpdateInterval: number) => void;
    initAutomatedForecast: () => boolean;
    stopAutomatedForecast: () => boolean;
    getLastPvForecast: () => PhotovoltaicForecast_Forecast;
    getPvForecastNow: () => Promise<PhotovoltaicForecast_Forecast>;
}
interface PhotovoltaicForecast_Error {
    message: string;
    errorData?: any;
}
declare type SunTime = {
    sunrise: Date;
    sunset: Date;
};
declare const PhotovoltaicForecast: ({ location, pvForecastUpdateInterval, newPvForecastCallback, errorCallback, pvForecastDays, apiKey }: PhotovoltaicForecast_Parameters) => PhotovoltaicForecast_Methods;
declare class PhotovoltaicForecast_DayForecast {
    pvGenerationPercentAvg: number;
    pvGenerationPercentPerHours: {
        [key: string]: number;
    };
    totalSunTimeHours: number;
    sunrise: Date;
    sunset: Date;
    constructor(pvGenerationPercentPerHours: {
        [key: string]: number;
    }, sunTime: SunTime);
    getDayPhotovoltaicGenerationPercentAvg(dayHoursForecastPercent: {
        [key: string]: number;
    }): number;
}
declare class PhotovoltaicForecast_Forecast {
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
}
interface coordinates {
    lat: number;
    lon: number;
}
declare class PhotovoltaicForecast_ForecastLocation {
    location: string;
    coordinates: coordinates;
    timezone: string;
    constructor(weatherApiLocationData: Object);
}
export default PhotovoltaicForecast;
