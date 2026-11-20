import { AppState } from 'react-native';
import BTTScreenTracker from './BTTScreenTracker';

interface NavigationRef {
  getCurrentRoute(): Route | undefined;
  getCurrentOptions?(): ScreenOptions | undefined;
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

function getScreenName(route: Route, options: ScreenOptions | undefined): string {
  const title = [options?.headerTitle, options?.title].find(
    (value): value is string => typeof value === 'string' && value.trim() !== ''
  );
  return title?.trim() ?? route.name;
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
}

export default BTTNavigationContainerTracker;
