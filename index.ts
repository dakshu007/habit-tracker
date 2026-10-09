// gesture-handler must be the first import in the entry file.
import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import App from './App';
import { widgetTaskHandler } from './src/widget/widgetTaskHandler';
// Defines the GPS run task at module scope (it can run headless with the app closed).
import './src/services/runTracker';

registerRootComponent(App);
// Home-screen widget renders + click actions run in a headless JS task.
registerWidgetTaskHandler(widgetTaskHandler);
