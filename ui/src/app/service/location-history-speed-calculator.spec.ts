
import { LocationHistory, LocationHistorySpeedTracker } from './location-history-speed-calculator';
import { Location, SensorNavigationService } from './sensor-navigation.service';

describe('Location History Speed Calculator', () => {

  beforeEach(() => {
  });

  it('track speed', () => {
    let tracker = new LocationHistorySpeedTracker(3);
    let trackerDeepState: TrackerDeepState = tracker as any;

    expect(trackerDeepState.locationHistory).toHaveSize(0);
    expect(tracker.getSpeedInKtsFromHistory()).toBe(0);

    let start = {
      accuracy: 7,
      latitude: 40.1,
      longitude: 37.2,
    }

    tracker.tryAddLocationToHistory({ timestamp: 0, coords: start })
    expect(trackerDeepState.locationHistory).toHaveSize(1);

    expect(tracker.getSpeedInKtsFromHistory()).toBe(0);

    {
      let position2 = getCoordsFromLocation(SensorNavigationService.calculateNewPosition(start, 1, 30), 6)
      tracker.tryAddLocationToHistory({ timestamp: 1000, coords: position2 })
      expect(trackerDeepState.locationHistory).toHaveSize(1);
      expect(tracker.getSpeedInKtsFromHistory()).toBeCloseTo(1.9438, 4);
    }

    {
      let position2 = getCoordsFromLocation(SensorNavigationService.calculateNewPosition(start, 1, 20), 6)
      tracker.tryAddLocationToHistory({ timestamp: 2000, coords: position2 })
      expect(trackerDeepState.locationHistory).toHaveSize(1);
      expect(tracker.getSpeedInKtsFromHistory()).toBeCloseTo(0.9719, 4);
    }

    {
      let position2 = getCoordsFromLocation(SensorNavigationService.calculateNewPosition(start, 8, 30), 6)
      tracker.tryAddLocationToHistory({ timestamp: 8000, coords: position2 })
      expect(trackerDeepState.locationHistory).toHaveSize(2);
      expect(tracker.getSpeedInKtsFromHistory()).toBeCloseTo(1.944, 3);
    }

    {
      let position2 = getCoordsFromLocation(SensorNavigationService.calculateNewPosition(start, 9, 30), 6)
      tracker.tryAddLocationToHistory({ timestamp: 9000, coords: position2 })
      expect(trackerDeepState.locationHistory).toHaveSize(2);
      expect(tracker.getSpeedInKtsFromHistory()).toBeCloseTo(1.944, 3);
    }
    
    {
      let oldestHistory = trackerDeepState.locationHistory[0];
      expect(oldestHistory.latitude).toBe(start.latitude);
      expect(oldestHistory.longitude).toBe(start.longitude);
    }


    {
      let position2 = getCoordsFromLocation(SensorNavigationService.calculateNewPosition(start, 16, 30), 6)
      tracker.tryAddLocationToHistory({ timestamp: 16000, coords: position2 })
      expect(trackerDeepState.locationHistory).toHaveSize(3);
      expect(tracker.getSpeedInKtsFromHistory()).toBeCloseTo(1.944, 3);
    }

    {
      let oldestHistory = trackerDeepState.locationHistory[0];
      expect(oldestHistory.latitude).toBe(start.latitude);
      expect(oldestHistory.longitude).toBe(start.longitude);
    }

    {
      let position2 = getCoordsFromLocation(SensorNavigationService.calculateNewPosition(start, 24, 30), 6)
      tracker.tryAddLocationToHistory({ timestamp: 24000, coords: position2 })
      expect(trackerDeepState.locationHistory).toHaveSize(3);
      expect(tracker.getSpeedInKtsFromHistory()).toBeCloseTo(1.944, 3);
    }

    {
      let oldestHistory = trackerDeepState.locationHistory[0];
      expect(oldestHistory.latitude).not.toBe(start.latitude);
      expect(oldestHistory.longitude).not.toBe(start.longitude);
    }


  });

});


type LocationAndAccuracy = {
  accuracy: number;
  latitude: number;
  longitude: number;
}

function getCoordsFromLocation(location: Location, accuracy: number): LocationAndAccuracy {
  (location as LocationAndAccuracy).accuracy = accuracy;
  return location as LocationAndAccuracy;
}

interface TrackerDeepState {
  locationHistory: LocationHistory[];
  lastLocation: LocationHistory;
}