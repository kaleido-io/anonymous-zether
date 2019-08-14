const ERC20Mintable = artifacts.require("ERC20Mintable");
const ZSC = artifacts.require("ZSC");
const utils = require('../../anonymous.js/src/utils/utils.js');
const BN = require('BN.js');
const bn128 = require('../../anonymous.js/src/utils/bn128.js');
const ZetherProver = require('../../anonymous.js/src/prover/zether/zether.js')
const BurnProver = require('../../anonymous.js/src/prover/burn/burn.js')

contract("ZSC", async accounts => {
    let erc20mintable;
    let zsc;
    beforeEach('setup contracts for each test', async function () {
        erc20mintable = await ERC20Mintable.deployed();
        zsc = await ZSC.deployed();
    });

    it("should allow depositing / funding", async () => {
        await erc20mintable.mint(accounts[0], 10000000);
        let balance = await erc20mintable.balanceOf.call(accounts[0]);
        assert.equal(
            balance,
            10000000,
            "Minting failed."
        );
        var acc = utils.createAccount();
        var y = acc['y'];
        //utils.saveAccountToJson(acc, "test-elgamal-key1.json");
        var resp = await zsc.register(y);
        var receipt = await web3.eth.getTransactionReceipt(resp.tx);
        assert.equal(
            receipt.status,
            "0x1",
            "Registration failed."
        ); // this might be necessary.
    });

    it("should deposit/fund", async () => {
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
        utils.saveAccountToJson(zethAccount, "test-elgamal-key2.json")
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
        var epoch = Math.floor(((new Date).getTime()/1000)/epochLength);
        var response = await zsc.simulateAccounts.call([zethAccount['y']], epoch+1);
        var balanceInZether = utils.readBalance(response[0][0], response[0][1], zethAccount['x']);
        assert.equal(
            balanceInZether,
            1000000,
            "Fund failed, zether balance should be 1000000."
        )
    });

    it("should allow burn", async() => {
        var zethBurnAccount = utils.loadAccountFromJson("test-elgamal-key2.json");
        var epochLength = await zsc.epochLength();
        var epoch = Math.floor(((new Date).getTime())/epochLength);
        var burnAccountState = await zsc.simulateAccounts.call([zethBurnAccount['y']], epoch);
        var value = 100000;
        var balanceInZether = utils.readBalance(burnAccountState[0][0], burnAccountState[0][1], zethBurnAccount['x']);
        assert.isAtLeast(balanceInZether, value, 'amount to be burn must be less than equal to zether balance')
        var simulated = burnAccountState[0];
        var CLn = bn128.serialize(bn128.unserialize(simulated[0]).add(bn128.curve.g.mul(new BN(-value))));
        var CRn = simulated[1];
        var burn = new BurnProver();
        var statement = {};
        statement['CLn'] = CLn;
        statement['CRn'] = CRn;
        statement['y'] = zethBurnAccount['y'];
        statement['bTransfer'] = value;
        statement['epoch'] = epoch;

        var witness = {};
        witness['x'] = zethBurnAccount['x'];
        witness['bDiff'] = 900000;
        var proof = burn.generateProof(statement, witness).serialize();
        //var proof = service.proveBurn(CLn, CRn, account.keypair['y'], value, state.lastRollOver, account.keypair['x'], state.available - value);
        var u = bn128.serialize(utils.u(epoch, zethBurnAccount['x']));
        //hacky stuff to pass tests, TODO: better way to handle epochs
        var responseEpochSet = await zsc.setEpoch(epoch);
        var receiptEpochSet =  await web3.eth.getTransactionReceipt(responseEpochSet.tx);
        assert.equal(
            receiptEpochSet.status,
            "0x1",
            "setting epoch failed."
        );
        var responseBurn = await zsc.burn(zethBurnAccount['y'], value, u, proof, { from: accounts[1], gas: 547000000 });
        var receiptBurn =  await web3.eth.getTransactionReceipt(responseBurn.tx);
        assert.equal(
            receiptBurn.status,
            "0x1",
            "Burning zether failed."
        ); 
        var balanceAfterBurn = await erc20mintable.balanceOf.call(accounts[1]);
        assert(
            balanceAfterBurn,
            9100000,
            "erc20 balance not updated after burn."
        );

    }); 

    it("should transfer funds", async () => {
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
        var epoch = Math.floor(((new Date).getTime())/epochLength);
        var senderState = await zsc.simulateAccounts.call([zethAccountFrom['y']], epoch);
        var balanceInZether = utils.readBalance(senderState[0][0], senderState[0][1], zethAccountFrom['x']);
        assert.equal(
            balanceInZether,
            1000000,
            "Fund failed, zether balance of sender should be 1000000 after fund."
        )
        var recipientState = await zsc.simulateAccounts.call([zethAccountTo['y']], epoch);
        // preparing proof
        var participants = [zethAccountFrom['y'],zethAccountTo['y']];
        var transferValue = 500000;
        var randomness = bn128.randomScalar();
        var L = [bn128.curve.g.mul(new BN(-transferValue)).add(bn128.unserialize(participants[0]).mul(randomness)), bn128.curve.g.mul(new BN(transferValue)).add(bn128.unserialize(participants[1]).mul(randomness))];
        var R = bn128.curve.g.mul(randomness);
        var CLn = [bn128.serialize(bn128.unserialize(senderState[0][0]).add(L[0])), bn128.serialize(bn128.unserialize(recipientState[0][0]).add(L[1]))];
        var CRn = [bn128.serialize(bn128.unserialize(senderState[0][1]).add(R)), bn128.serialize(bn128.unserialize(recipientState[0][1]).add(R))];
        var index = [0,1];
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
        //hacky stuff to pass tests, TODO: better way to handle epochs
        var responseEpochSet = await zsc.setEpoch(epoch);
        var receiptEpochSet =  await web3.eth.getTransactionReceipt(responseEpochSet.tx);
        assert.equal(
            receiptEpochSet.status,
            "0x1",
            "setting epoch failed."
        );
        var responseTransfer = await zsc.transfer(L, R, participants, u, proof, {from: accounts[4], gas: 50000000});
        var receiptTransfer =  await web3.eth.getTransactionReceipt(responseTransfer.tx);
        assert.equal(
            receiptTransfer.status,
            "0x1",
            "Transferring zether failed."
        );  
    });
});
