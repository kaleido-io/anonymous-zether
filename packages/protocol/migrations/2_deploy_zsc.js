var BurnVerifier = artifacts.require("BurnVerifier");
var ZetherVerifier = artifacts.require("ZetherVerifier");
var ERC20Mintable = artifacts.require("ERC20Mintable");
var ZSC = artifacts.require("ZSC");

// Using first two addresses of Ganache
module.exports = async function(deployer) {
    await deployer.deploy(ERC20Mintable);
    await deployer.deploy(ZetherVerifier);
    await deployer.deploy(BurnVerifier);
    await deployer.deploy(ZSC, ERC20Mintable.address, ZetherVerifier.address, BurnVerifier.address, 6);
};
