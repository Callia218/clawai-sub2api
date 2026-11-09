import adminAccessKeys from './adminAccessKeys'
import referenceLanding from './referenceLanding'
import mcp from './mcp'
import landing from './landing'
import glass from './glass'
import glassDemo from './glassDemo'
import welcome from './welcome'
import accessGuide from './accessGuide'
import common from './common'
import dashboard from './dashboard'
import channelMonitorV2 from './channelMonitorV2'
import batchImage from './batchImage'
import admin from './admin'
import misc from './misc'
import pelican from './pelican'

export default {
  adminAccessKeys,
  ...referenceLanding,
  mcp,
  ...landing,
  ...glass,
  glassDemo,
  ...welcome,
  ...accessGuide,
  ...common,
  ...dashboard,
  ...channelMonitorV2,
  ...batchImage,
  admin,
  ...misc,
  ...pelican,
}
