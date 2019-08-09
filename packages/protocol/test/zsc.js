const ERC20Mintable = artifacts.require("ERC20Mintable");
const ZSC = artifacts.require("ZSC");
const utils = require('../../anonymous.js/src/utils/utils.js');
const BN = require('BN.js');
const Service = require('../../anonymous.js/src/utils/service.js');
const bn128 = require('../../anonymous.js/src/utils/bn128.js');
const ZetherProver = require('../../anonymous.js/src/prover/zether/zether.js')

contract("ZSC", async accounts => {
    it("should allow depositing / funding", async () => {
        let erc20mintable = await ERC20Mintable.deployed();
        let zsc = await ZSC.deployed();
        await erc20mintable.mint(accounts[0], 10000000);
        let balance = await erc20mintable.balanceOf.call(accounts[0]);
        assert.equal(
            balance,
            10000000,
            "Minting failed."
        );
        var y = utils.createAccount()['y'];
        var resp = await zsc.register(y);
        var receipt = await web3.eth.getTransactionReceipt(resp.tx);
        assert.equal(
            receipt.status,
            "0x1",
            "Registration failed."
        ); // this might be necessary.
    });

    it("should deposit/fund", async () => {
        let erc20mintable = await ERC20Mintable.deployed();
        let zsc = await ZSC.deployed();
        let zscAddress = zsc.address;
        await erc20mintable.mint(accounts[1], 10000000);
        let balance = await erc20mintable.balanceOf.call(accounts[1]);
        assert.equal(
            balance,
            10000000,
            "Minting failed."
        );
        var responseApprove = await erc20mintable.approve(zscAddress, 1000000, {
            from : accounts[1]
        });
        var receiptApprove = await web3.eth.getTransactionReceipt(responseApprove.tx);
        assert.equal(
            receiptApprove.status,
            "0x1",
            "approving funds to zsc failed."
        );
        var zethAccount = utils.createAccount();
        var responseRegister = await zsc.register(zethAccount['y'], {
            from : accounts[1]
        });
        var receiptRegister = await web3.eth.getTransactionReceipt(responseRegister.tx);
        assert.equal(
            receiptRegister.status,
            "0x1",
            "Registration failed."
        );
        var responseFund = await zsc.fund(zethAccount['y'], 1000000, { from: accounts[1] });
        var receiptFund = await web3.eth.getTransactionReceipt(responseFund.tx);
        assert.equal(
            receiptFund.status,
            "0x1",
            "Fund failed."
        );
        let balanceAfterFund = await erc20mintable.balanceOf.call(accounts[1]);
        assert.equal(
            balanceAfterFund,
            9000000,
            "Fund failed, erc20 balance not updated after fund."
        );
        var epochLength = await zsc.epochLength();
        var epoch = Math.floor((new Date).getTime()/epochLength);
        var response = await zsc.simulateAccounts.call([zethAccount['y']], epoch+1);
        var balanceInZether = utils.readBalance(response[0][0], response[0][1], zethAccount['x']);
        assert.equal(
            balanceInZether,
            1000000,
            "Fund failed, zether balance should be 1000000."
        )
    });

    it("should transfer funds", async () => {
        let erc20mintable = await ERC20Mintable.deployed();
        let zsc = await ZSC.deployed();
        let zscAddress = zsc.address;
        await erc20mintable.mint(accounts[2], 10000000);
        let balance = await erc20mintable.balanceOf.call(accounts[2]);
        assert.equal(
            balance,
            10000000,
            "Minting failed."
        );
        var responseApprove = await erc20mintable.approve(zscAddress, 1000000, {
            from : accounts[2]
        });
        var receiptApprove = await web3.eth.getTransactionReceipt(responseApprove.tx);
        assert.equal(
            receiptApprove.status,
            "0x1",
            "approving funds to zsc failed."
        );
        var zethAccountFrom = utils.createAccount();
        var zethAccountTo = utils.createAccount();
        var responseRegisterFrom = await zsc.register(zethAccountFrom['y'], {
            from : accounts[2]
        });
        var responseRegisterTo = await zsc.register(zethAccountTo['y'], {
            from : accounts[3]
        });
        var receiptRegisterFrom = await web3.eth.getTransactionReceipt(responseRegisterFrom.tx);
        assert.equal(
            receiptRegisterFrom.status,
            "0x1",
            "Registration of sender failed."
        );
        var receiptRegisterTo = await web3.eth.getTransactionReceipt(responseRegisterTo.tx);
        assert.equal(
            receiptRegisterTo.status,
            "0x1",
            "Registration of recipient failed."
        );
        var responseFund = await zsc.fund(zethAccountFrom['y'], 1000000, { from: accounts[2] });
        var receiptFund = await web3.eth.getTransactionReceipt(responseFund.tx);
        assert.equal(
            receiptFund.status,
            "0x1",
            "Funding of sender failed."
        );
        let balanceAfterFund = await erc20mintable.balanceOf.call(accounts[2]);
        assert.equal(
            balanceAfterFund,
            9000000,
            "Fund failed, erc20 balance of sender account not updated after fund."
        );
        var epochLength = await zsc.epochLength();
        var epoch = Math.floor((new Date).getTime()/epochLength);
        var senderState = await zsc.simulateAccounts.call([zethAccountFrom['y']], epoch);
        var balanceInZether = utils.readBalance(senderState[0][0], senderState[0][1], zethAccountFrom['x']);
        assert.equal(
            balanceInZether,
            1000000,
            "Fund failed, zether balance of sender should be 1000000 after fund."
        )
        var recipientState = await zsc.simulateAccounts.call([zethAccountTo['y']], epoch);
        // preparing proof
        var participants = [zethAccountFrom['y']].concat([zethAccountTo['y']]);
        var transferValue = 500000;
        var randomness = bn128.randomScalar();
        var L = [bn128.curve.g.mul(new BN(-transferValue)).add(bn128.unserialize(participants[0]).mul(randomness))].concat([bn128.curve.g.mul(new BN(transferValue)).add(bn128.unserialize(participants[1]).mul(randomness))]);
        var R = bn128.curve.g.mul(randomness);
        var CLn = [bn128.serialize(bn128.unserialize(senderState[0][0]).add(L[0]))].concat([bn128.serialize(bn128.unserialize(recipientState[0][0]).add(L[1]))]);
        var CRn = [bn128.serialize(bn128.unserialize(senderState[0][1]).add(R))].concat([bn128.serialize(bn128.unserialize(recipientState[0][1]).add(R))]);
        var index = [0].concat([1]);
        L = L.map(bn128.serialize);
        R = bn128.serialize(R);
        
        var statement = {};
        statement['CLn'] = CLn;
        statement['CRn'] = CRn;
        statement['L'] = L;
        statement['R'] = R;
        statement['y'] = participants;
        statement['epoch'] = epoch;

        var witness = {};
        witness['x'] = zethAccountFrom['x'];
        witness['r'] = randomness;
        witness['bTransfer'] = transferValue;
        witness['bDiff'] = transferValue;
        witness['index'] = index;

        var zether = new ZetherProver();

        var proof = zether.generateProof(statement, witness).serialize();

        var u = bn128.serialize(utils.u(epoch, zethAccountFrom['x']));
        var responseTransfer = await zsc.transfer(L, R, participants, u, proof, {from: accounts[4]});
        var receiptTransfer =  await web3.eth.getTransactionReceipt(responseTransfer.tx);
        assert.equal(
            receiptTransfer.status,
            "0x1",
            "Transferring zether failed."
        );  
    });
});