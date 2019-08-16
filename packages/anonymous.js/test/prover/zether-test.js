'use strict';

const chai = require('chai');
const sinon = require('sinon');
chai.use(require('sinon-chai'));
chai.use(require('chai-as-promised'));
const expect = chai.expect;

const ZetherProver = require('../../src/prover/zether/zether.js');
const BurnProver = require('../../src/prover/burn/burn.js');

describe('ZetherProver tests', () => {
  let prover;

  it('constructor test', () => {
    prover = new ZetherProver();
  });
});

describe('BurnProver tests', () => {
  let prover;

  it('constructor test', () => {
    prover = new BurnProver();
  });
});