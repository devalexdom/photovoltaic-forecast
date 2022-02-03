# photovoltaic-forecast

Gives a photovoltaic generation forecast using weatherapi.com data, percentages equal to the maximum possible capacity of the solar cells each hour, keep in mind that the orientation, the working temperature and the dim light of sunrise/sunset are not being taken into account.

## Usage

1. `npm i photovoltaic-forecast`

2. Run on Node.JS:

```javascript
const PhotovoltaicForecast = require("photovoltaic-forecast");

const pvForecast = PhotovoltaicForecast({
  location: "Barcelona, Catalonia, Spain",
  apiKey: "YOUR_API_KEY",
});

pvForecast.getPvForecastNow()
  .then((data) => {
    console.log(data);
    /*
    PhotovoltaicForecast_Forecast {
        forecastDate: 2022-02-02T00:19:03.247Z,
        forecastLocation: PhotovoltaicForecast_ForecastLocation {
            location: 'Barcelona, Catalonia, Spain',
            coordinates: { lat: 41.38, lon: 2.18 },
            timezone: 'Europe/Madrid'
        },
        todayPvGenerationPercentAvg: 96.73,
        todayPvGenerationPercentPerHours: {
            ...
            '2022-02-02T05:00:00.000Z': 0,
            '2022-02-02T06:00:00.000Z': 0,
            '2022-02-02T07:00:00.000Z': 86,
            '2022-02-02T08:00:00.000Z': 90,
            '2022-02-02T09:00:00.000Z': 88,
            '2022-02-02T10:00:00.000Z': 100,
            '2022-02-02T11:00:00.000Z': 100,
            '2022-02-02T12:00:00.000Z': 100,
            '2022-02-02T13:00:00.000Z': 100,
            '2022-02-02T14:00:00.000Z': 100,
            '2022-02-02T15:00:00.000Z': 100,
            '2022-02-02T16:00:00.000Z': 100,
            '2022-02-02T17:00:00.000Z': 100,
            '2022-02-02T18:00:00.000Z': 0,
            '2022-02-02T19:00:00.000Z': 0,
            '2022-02-02T20:00:00.000Z': 0,
            ... Welcome to the European Californian 😎
        },
  ...
  */
  })
  .catch((error) => {
    //Handle errors
    console.error(error);
  });
```

3. And start making great green things 🌱🌍!

---

---

---

## An example of automated a photovoltaic forecast usage

```javascript
const PhotovoltaicForecast = require("photovoltaic-forecast");

PhotovoltaicForecast({
  location: "My house",
  pvForecastUpdateInterval: 1800, //In seconds, so 1800 seconds = 30 minutes
  apiKey: "YOUR_API_KEY",
  newPvForecastCallback: (data) => {
    if (data.getNextPvGenerationDay().pvGenerationPercentAvg < 70 && isOffPeakHour()){
      UseGridToChargeMySolarBatteries();
    }
    else {
      UsePvOnlyToChargeMySolarBatteries();
    }
  },
  errorCallback: (error) => {
    //Handle errors
    console.error(error);
  },
});
```

## Constructor parameters

### location: string

Forecast location

- Latitude and Longitude (Decimal degree) e.g: "48.8567,2.3508"
- city name e.g.: "Paris"
- US zip e.g.: "10001"
- UK postcode e.g: "SW1"
- Canada postal code e.g: "G2J"
- metar:<metar code> e.g: "metar:EGLL"
- iata:<3 digit airport code> e.g: "iata:DXB"
- auto:ip IP lookup e.g: "auto:ip"
- IP address (IPv4 and IPv6 supported) e.g: "100.0.0.1"

### Optional pvForecastUpdateInterval?: number;

Sets the forecast update period of time in seconds, 0 to disable automation

### Optional newPvForecastCallback?: (forecast: PhotovoltaicForecast_Forecast) => any;

Callback with the new forecast as argument (Automation only)

### Optional errorCallback?: (error: PhotovoltaicForecast_Error) => any;

Callback with error details as argument (Automation only)

### Optional pvForecastDays?: number;

Sets the number of days including today of the forecast, your weatherapi.com plan could limit the days

### apiKey: string;

Your weatherapi.com api key

```javascript
PhotovoltaicForecast({
  location: "Marville, Lorraine, France",
  pvForecastUpdateInterval: 1800, //In seconds, so 1800 seconds = 30 minutes
  newPvForecastCallback: (pvForecast) => {
    console.log(pvForecast);
  },
  errorCallback: (error) => {
    //Handle errors
    console.error(error);
  },
  pvForecastDays: 3,
  apiKey: "YOUR_API_KEY",
});
```

## Methods

### getPvForecastNow: () => Promise<PhotovoltaicForecast_Forecast>;

Returns a Promise of a PhotovoltaicForecast_Forecast (Does a new photovoltaic forecast):

```typescript
class PhotovoltaicForecast_Forecast {
  forecastDate: Date;
  forecastLocation: PhotovoltaicForecast_ForecastLocation;
  todayPvGenerationPercentAvg: number;
  todayPvGenerationPercentPerHours: { [key: string]: number };
  tomorrowPvGenerationPercentAvg: number;
  tomorrowPvGenerationPercentPerHours: { [key: string]: number };
  nextDaysPvGeneration: { [key: string]: PhotovoltaicForecast_DayForecast };

  getNextPvGenerationDay: () => PhotovoltaicForecast_DayForecast;
}

class PhotovoltaicForecast_DayForecast {
  date: Date;
  pvGenerationPercentAvg: number;
  pvGenerationPercentPerHours: { [key: string]: number };
  peakSunHoursPvGenerationPercentAvg: number;
  totalSunTimeHours: number;
  sunrise: Date;
  sunset: Date;
}

interface coordinates {
  lat: number;
  lon: number;
}

class PhotovoltaicForecast_ForecastLocation {
  location: string;
  coordinates: coordinates;
  timezone: string;
}
```

### setNewLocation: (newLocation: string) => void;

Change the forecast location (Automated photovoltaic forecast on a camper van maybe 👀)

### setNewPvForecastUpdateInterval: (newPvForecastUpdateInterval: number) => void;

Change the forecast update period of time in seconds

### initAutomatedForecast: () => boolean;

Inits the automated photovoltaic forecast if pvForecastUpdateInterval is greater that 0

### stopAutomatedForecast: () => boolean;

Stops the automated photovoltaic forecast

### getLastPvForecast: () => PhotovoltaicForecast_Forecast;

Returns the latest photovoltaic forecast done
