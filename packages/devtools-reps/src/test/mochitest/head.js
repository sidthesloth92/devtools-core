/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* Entirely disable no-unused-vars, because the second line here
   doesn't seem to work with eslint 3.15.0 -- it doesn't suppress
   other no-unused-vars errors.  */
/* eslint-disable no-unused-vars */
/* eslint no-unused-vars: ["error", {"vars": "local"}] */

/* globals is */

/* Not really a module.  */
/* eslint-disable strict */
"use strict";

var { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;

var { require } = Cu.import("resource://devtools/shared/Loader.jsm", {});
var { Assert } = require("resource://testing-common/Assert.jsm");
var { gDevTools } = require("devtools/client/framework/devtools");
var { BrowserLoader } = Cu.import("resource://devtools/client/shared/browser-loader.js", {});
var flags = require("devtools/shared/flags");
var { Task } = require("devtools/shared/task");
const nodeConstants = require("devtools/shared/dom-node-constants");
var DevToolsUtils = require("devtools/shared/DevToolsUtils");

flags.testing = true;
var { require: browserRequire } = BrowserLoader({
  baseURI: "resource://devtools/client/shared/",
  window
});

let ReactDOM = browserRequire("devtools/client/shared/vendor/react-dom");
let React = browserRequire("devtools/client/shared/vendor/react");
var TestUtils = React.addons.TestUtils;
const {
  getGripPreviewItems
} = browserRequire("devtools/client/shared/components/reps/reps");

function renderComponent(component, props) {
  const el = React.createElement(component, props, {});
  // By default, renderIntoDocument() won't work for stateless components, but
  // it will work if the stateless component is wrapped in a stateful one.
  // See https://github.com/facebook/react/issues/4839
  const wrappedEl = React.DOM.span({}, [el]);
  const renderedComponent = TestUtils.renderIntoDocument(wrappedEl);
  return ReactDOM.findDOMNode(renderedComponent).children[0];
}

function shallowRenderComponent(component, props) {
  const el = React.createElement(component, props);
  const renderer = TestUtils.createRenderer();
  renderer.render(el, {});
  return renderer.getRenderOutput();
}

/**
 * Test that a rep renders correctly across different modes.
 */
function testRepRenderModes(modeTests, testName, componentUnderTest, gripStub,
  props = {}) {
  modeTests.forEach(({mode, expectedOutput, message, title}) => {
    const modeString = typeof mode === "undefined" ? "no mode" : mode.toString();
    if (!message) {
      message = `${testName}: ${modeString} renders correctly.`;
    }

    const rendered = renderComponent(
      componentUnderTest.rep,
      Object.assign({}, { object: gripStub, mode, title }, props)
    );
    is(rendered.textContent, expectedOutput, message);
  });
}

/**
 * Get an array of all the items from the grip in parameter (including the grip itself)
 * which can be selected in the inspector.
 *
 * @param {Object} Grip
 * @return {Array} Flat array of the grips which can be selected in the inspector
 */
function getSelectableInInspectorGrips(grip) {
  let grips = new Set(getFlattenedGrips([grip]));
  return [...grips].filter(isGripSelectableInInspector);
}

/**
 * Indicate if a Grip can be selected in the inspector,
 * i.e. if it represents a node element.
 *
 * @param {Object} Grip
 * @return {Boolean}
 */
function isGripSelectableInInspector(grip) {
  return grip
    && typeof grip === "object"
    && grip.preview
    && [
      nodeConstants.TEXT_NODE,
      nodeConstants.ELEMENT_NODE
    ].includes(grip.preview.nodeType);
}

/**
 * Get a flat array of all the grips and their preview items.
 *
 * @param {Array} Grips
 * @return {Array} Flat array of the grips and their preview items
 */
function getFlattenedGrips(grips) {
  return grips.reduce((res, grip) => {
    let previewItems = getGripPreviewItems(grip);
    let flatPreviewItems = previewItems.length > 0
      ? getFlattenedGrips(previewItems)
      : [];

    return [...res, grip, ...flatPreviewItems];
  }, []);
}
