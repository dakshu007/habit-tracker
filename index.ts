// gesture-handler must be the first import in the entry file.
import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import App from './App';
import { widgetTaskHandler } from './src/widget/widgetTaskHandler';

registerRootComponent(App);
// Home-screen widget renders + click actions run in a headless JS task.
registerWidgetTaskHandler(widgetTaskHandler);
