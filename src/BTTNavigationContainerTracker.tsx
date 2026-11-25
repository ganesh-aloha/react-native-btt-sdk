import { AppState } from 'react-native';
import BTTScreenTracker from './BTTScreenTracker';
import BttSdk from './BttSdk';

interface NavigationRef {
  getCurrentRoute(): Route | undefined;
  getCurrentOptions?(): ScreenOptions | undefined;
  addListener?(type: 'options', callback: () => void): () => void;
}

interface Route {
  key: string;
  name: string;
}

interface ScreenOptions {
  title?: string;
  headerTitle?: unknown;
}

interface ActiveScreen {
  id: string;
  name: string;
}

function getScreenTitle(options: ScreenOptions | undefined): string | undefined {
  const title = [options?.headerTitle, options?.title].find(
    (value): value is string => typeof value === 'string' && value.trim() !== ''
  );
  return title?.trim();
}

function getScreenName(route: Route, options: ScreenOptions | undefined): string {
  return getScreenTitle(options) ?? route.name;
}

class BTTNavigationContainerTracker {

  private static isListenerAttached: boolean = false
  private static activeScreen: ActiveScreen | undefined;

  static applicationDidEnterBackground(_navigationRef?: NavigationRef) {
    BTTNavigationContainerTracker.endActiveScreen();
  }

  static onContainerStateChange(navigationRef: NavigationRef) {
    const route = navigationRef?.getCurrentRoute?.();

    if (!route?.key || !route.name) return;

    if (!BTTNavigationContainerTracker.isListenerAttached) {
      BTTNavigationContainerTracker.attachBackgroundListener(navigationRef);
      BTTNavigationContainerTracker.attachOptionsListener(navigationRef);
      BTTNavigationContainerTracker.isListenerAttached = true;
    }

    if (BTTNavigationContainerTracker.activeScreen?.id === route.key) return;

    BTTNavigationContainerTracker.endActiveScreen();

    const name = getScreenName(route, navigationRef.getCurrentOptions?.());
    BTTScreenTracker.viewStart(name, route.key);
    BTTNavigationContainerTracker.activeScreen = { id: route.key, name };
  }

  private static endActiveScreen() {
    const screen = BTTNavigationContainerTracker.activeScreen;
    if (!screen) return;

    BTTScreenTracker.viewingEnd(screen.name, screen.id);
    BTTNavigationContainerTracker.activeScreen = undefined;
  }

  private static attachBackgroundListener(navigationRef: NavigationRef) {
    console.log("Attached Background Listener..")
    AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        console.log("App moved to foreground")
        BTTNavigationContainerTracker.onContainerStateChange(navigationRef);
      } else if (state === 'background') {
        console.log("App moved to background")
        BTTNavigationContainerTracker.applicationDidEnterBackground(navigationRef);
      }
    });
  }

  private static attachOptionsListener(navigationRef: NavigationRef) {
    navigationRef.addListener?.('options', () => {
      const active = BTTNavigationContainerTracker.activeScreen;
      if (!active) return;

      // Options can change for a screen that is not the one being tracked.
      const route = navigationRef?.getCurrentRoute?.();
      if (route?.key !== active.id || !route.name) return;

      // Only a title carries a better name than the one the screen started with.
      // An options change without one says nothing about naming, and the route
      // name is already in use, so there is nothing to apply.
      const title = getScreenTitle(navigationRef.getCurrentOptions?.());
      if (!title || title === active.name) return;

      // Only remember the new name once it has actually been applied, so a later
      // options event can try again.
      if (BTTNavigationContainerTracker.applyGroupName(title)) {
        active.name = title;
      }
    });
  }

  private static applyGroupName(name: string): boolean {
    try {
      if (typeof BttSdk?.setGroupName !== 'function') {
        return false;
      }

      BttSdk.setGroupName(name);
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default BTTNavigationContainerTracker;
