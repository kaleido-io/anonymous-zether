var BurnVerifier = artifacts.require("BurnVerifier");
var ZetherVerifier = artifacts.require("ZetherVerifier");
var CashToken = artifacts.require("CashToken");
var ZSC = artifacts.require("ZSC");

// Using first two addresses of Ganache
module.exports = async function(deployer) {
    await deployer.deploy(CashToken);
    await deployer.deploy(ZetherVerifier);
    await deployer.deploy(BurnVerifier);
    deployer.deploy(ZSC, CashToken.address, ZetherVerifier.address, BurnVerifier.address, 3000);
};