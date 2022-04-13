// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

'use strict'

const { prefs: prefServ } = ChromeUtils.import(
  'resource://gre/modules/Services.jsm'
).Services

let typeSelectorPref = new Map([
  [
    prefServ.PREF_BOOL,
    { get: prefServ.getBoolPref, set: prefServ.setBoolPref },
  ],
  [prefServ.PREF_INT, { get: prefServ.getIntPref, set: prefServ.setIntPref }],
  [
    prefServ.PREF_STRING,
    { get: prefServ.getStringPref, set: prefServ.setStringPref },
  ],
])
let typeSelectorValue = new Map([
  ['string', prefServ.PREF_STRING],
  ['boolean', prefServ.PREF_BOOL],
  ['number', prefServ.PREF_INT],
])

class ConfigAPI extends ExtensionAPI {
  getAPI(context) {
    return {
      experiments: {
        prefs: {
          get(name) {
            // you must double default args in signature
            return new Promise((resolve, reject) => {
              try {
                let prefType = prefServ.getPrefType(name)
                let getPrefFunction = typeSelectorPref.get(prefType).get
                if (getPrefFunction) {
                  let res = getPrefFunction(name)
                  resolve(res)
                } else {
                  reject(`The type ${prefType} is not able to be set`)
                }
              } catch (ex) {
                console.log(ex)
                reject(ex)
              }
            })
          },

          async set(name, value) {
            // you must double default args in signature
            return new Promise((resolve, reject) => {
              try {
                let valueT = typeSelectorValue.get(typeof value)
                let tFuncs = typeSelectorPref.get(valueT)
                //let t = prefServ.getPrefType(name);

                if (tFuncs) {
                  let res = tFuncs['set'](name, value)
                  resolve(res)
                } else {
                  resolve(null)
                }
              } catch (ex) {
                reject({
                  error: ex.message,
                })
              }
            })
          },
          async reset(name) {
            prefServ.clearUserPref(name)
          },
          async lock(name) {
            prefServ.lockPref(name)
          },
          async unlock(name) {
            prefServ.unlockPref(name)
          },
          async isLocked(name) {
            return prefServ.prefIsLocked(name)
          },
          async hasUserValue(name) {
            return prefServ.prefHasUserValue(name)
          },
          async getChildList(name) {
            return prefServ.getChildList(name)
          },
          onChange: new ExtensionCommon.EventManager({
            context,
            name: 'experiments.config.onChange',
            register: (cb, branch = '') => {
              console.log('register called', cb, branch)
              let observer = {
                async observe(branch, topic, refPath) {
                  console.log('observe called', branch, topic, refPath)
                  let res = await cb.async(topic, refPath)
                },
              }
              console.log('observer created', observer)
              prefServ.addObserver(branch, observer, false)
              console.log('observer registered')
              return () => {
                prefServ.removeObserver(branch, observer)
                console.log('observer removed')
              }
            },
          }).api(),
        },
      },
    }
  }
}

var prefs // identifier from the manifest (key in experiment_apis). __FORMERLY__ COULD BE ANY matching the key in experiment_apis within the manifest. NOW it MUST match API name !!!
prefs = ConfigAPI //let, const, class, export or without var don't work.
