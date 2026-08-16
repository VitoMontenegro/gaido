import { mountApp } from '@gaido/shared/bootstrap'
import { LocationProvider } from '@gaido/discover-ui'
import App from './App'

mountApp(App, { leaflet: true, locationProvider: LocationProvider })
