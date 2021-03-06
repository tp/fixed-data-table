/**
 * Copyright (c) 2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ImmutableObject
 * @typechecks
 */

'use strict';

var ImmutableValue = require('ImmutableValue');

var invariant = require('invariant');
var keyOf = require('keyOf');
var mergeHelpers = require('mergeHelpers');

var checkMergeObjectArgs = mergeHelpers.checkMergeObjectArgs;
var isTerminal = mergeHelpers.isTerminal;

var SECRET_KEY = keyOf({_DONT_EVER_TYPE_THIS_SECRET_KEY: null});

/**
 * Static methods creating and operating on instances of `ImmutableValue`.
 */
function assertImmutable(immutable) {
  invariant(
    immutable instanceof ImmutableValue,
    'ImmutableObject: Attempted to set fields on an object that is not an ' +
    'instance of ImmutableValue.'
  );
}

/**
 * Static methods for reasoning about instances of `ImmutableObject`. Execute
 * the freeze commands in `__DEV__` mode to alert the programmer that something
 * is attempting to mutate. Since freezing is very expensive, we avoid doing it
 * at all in production.
 */
class ImmutableObject extends ImmutableValue {
  /**
   * @arguments {array<object>} The arguments is an array of objects that, when
   * merged together, will form the immutable objects.
   */
  constructor() {
    super(ImmutableValue[SECRET_KEY]);
    ImmutableValue.mergeAllPropertiesInto(this, arguments);
    if (__DEV__) {
      ImmutableValue.deepFreezeRootNode(this);
    }
  }

  /**
   * DEPRECATED - prefer to instantiate with new ImmutableObject().
   *
   * @arguments {array<object>} The arguments is an array of objects that, when
   * merged together, will form the immutable objects.
   */
  static create() {
    var obj = Object.create(ImmutableObject.prototype);
    ImmutableObject.apply(obj, arguments);
    return obj;
  }

  /**
   * Returns a new `ImmutableValue` that is identical to the supplied
   * `ImmutableValue` but with the specified changes, `put`. Any keys that are
   * in the intersection of `immutable` and `put` retain the ordering of
   * `immutable`. New keys are placed after keys that exist in `immutable`.
   *
   * @param {ImmutableValue} immutable Starting object.
   * @param {?object} put Fields to merge into the object.
   * @return {ImmutableValue} The result of merging in `put` fields.
   */
  static set(immutable, put) {
    assertImmutable(immutable);
    invariant(
      typeof put === 'object' && put !== undefined && !Array.isArray(put),
      'Invalid ImmutableMap.set argument `put`'
    );
    return new ImmutableObject(immutable, put);
  }

  /**
   * Sugar for `ImmutableObject.set(ImmutableObject, {fieldName: putField})`.
   * Look out for key crushing: Use `keyOf()` to guard against it.
   *
   * @param {ImmutableValue} immutableObject Object on which to set properties.
   * @param {string} fieldName Name of the field to set.
   * @param {*} putField Value of the field to set.
   * @return {ImmutableValue} new ImmutableValue as described in `set`.
   */
  static setProperty(immutableObject, fieldName, putField) {
    var put = {};
    put[fieldName] = putField;
    return ImmutableObject.set(immutableObject, put);
  }

  /**
   * Returns a new immutable object with the given field name removed.
   * Look out for key crushing: Use `keyOf()` to guard against it.
   *
   * @param {ImmutableObject} immutableObject from which to delete the key.
   * @param {string} droppedField Name of the field to delete.
   * @return {ImmutableObject} new ImmutableObject without the key
   */
  static deleteProperty(immutableObject, droppedField) {
    var copy = {};
    for (var key in immutableObject) {
      if (key !== droppedField && immutableObject.hasOwnProperty(key)) {
        copy[key] = immutableObject[key];
      }
    }
    return new ImmutableObject(copy);
  }

  /**
   * Returns a new `ImmutableValue` that is identical to the supplied object but
   * with the supplied changes recursively applied.
   *
   * Experimental. Likely does not handle `Arrays` correctly.
   *
   * @param {ImmutableValue} immutable Object on which to set fields.
   * @param {object} put Fields to merge into the object.
   * @return {ImmutableValue} The result of merging in `put` fields.
   */
  static setDeep(immutable, put) {
    assertImmutable(immutable);
    return _setDeep(immutable, put);
  }

  /**
   * Retrieves an ImmutableObject's values as an array.
   *
   * @param {ImmutableValue} immutable
   * @return {array}
   */
  static values(immutable) {
    return Object.keys(immutable).map((key) => immutable[key]);
  }
}

function _setDeep(obj, put) {
  checkMergeObjectArgs(obj, put);
  var totalNewFields = {};

  // To maintain the order of the keys, copy the base object's entries first.
  var keys = Object.keys(obj);
  for (var ii = 0; ii < keys.length; ii++) {
    var key = keys[ii];
    if (!put.hasOwnProperty(key)) {
      totalNewFields[key] = obj[key];
    } else if (isTerminal(obj[key]) || isTerminal(put[key])) {
      totalNewFields[key] = put[key];
    } else {
      totalNewFields[key] = _setDeep(obj[key], put[key]);
    }
  }

  // Apply any new keys that the base obj didn't have.
  var newKeys = Object.keys(put);
  for (ii = 0; ii < newKeys.length; ii++) {
    var newKey = newKeys[ii];
    if (obj.hasOwnProperty(newKey)) {
      continue;
    }
    totalNewFields[newKey] = put[newKey];
  }

  return (
    obj instanceof ImmutableValue ? new ImmutableObject(totalNewFields) :
    put instanceof ImmutableValue ? new ImmutableObject(totalNewFields) :
    totalNewFields
  );
}

module.exports = ImmutableObject;
