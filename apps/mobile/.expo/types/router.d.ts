/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(auth)` | `/(auth)/login` | `/(direction)` | `/(direction)/` | `/(direction)/fees` | `/(direction)/profile` | `/(direction)/students` | `/(student)` | `/(student)/` | `/(student)/absences` | `/(student)/courses` | `/(student)/exercises` | `/(student)/finances` | `/(student)/grades` | `/(student)/profile` | `/(student)/schedule` | `/(teacher)` | `/(teacher)/` | `/(teacher)/courses` | `/(teacher)/exercises` | `/(teacher)/profile` | `/_sitemap` | `/absences` | `/courses` | `/exercises` | `/fees` | `/finances` | `/grades` | `/login` | `/profile` | `/schedule` | `/students`;
      DynamicRoutes: never;
      DynamicRouteTemplate: never;
    }
  }
}
