const BigNumber = require("bignumber.js");

const GenxToken = artifacts.require("GENX");
const GenxStaking = artifacts.require("DAO");
const GenxDAO = artifacts.require("DAO");

const DAY = 60 * 60 * 24;

// Uses new instead of deployed due to problems with the clean room env truffle should provide

contract("Genesis Network DAO Test", async (accounts) => {
  it("Should support fund proposals", async () => {
    let GENX = await GenxToken.new();
    let stake = await GenxStaking.new(GENX.address);
    await GENX.transferOwnership(stake.address);
    let dao = await GenxDAO.new(stake.address);
    await stake.upgradeDevelopmentFund(dao.address);
    await stake.transferOwnership(dao.address);

    // Stake so we have voting weight/to init the dev fund
    await GENX.approve(stake.address, 1);
    await stake.increaseStake(1);
    await (new Promise((resolve) => {
      web3.currentProvider.send({
        jsonrpc: "2.0",
        method: "evm_increaseTime",
        params: [29 * DAY],
        id: null
      }, resolve);
    }));

    // Claim the rewards so the dev fund gets 5%.
    await stake.claimRewards();
    // Advance the clock a second to make sure lastClaim is different
    await (new Promise((resolve) => {
      web3.currentProvider.send({
        jsonrpc: "2.0",
        method: "evm_increaseTime",
        params: [1],
        id: null
      }, resolve);
    }));

    let devFund = new BigNumber(await GENX.balanceOf.call(dao.address));
    assert(devFund.gt(new BigNumber(0)));

    // Create a proposal for funds.
    await GENX.approve(dao.address, new BigNumber("10e18"));
    let id = (await dao.proposeFund(accounts[0], devFund, "Info for Fund")).logs[0].args.proposal;
    let balance = new BigNumber(await GENX.balanceOf.call(accounts[0]));
    await dao.completeProposal(id, [accounts[0]]);

    // The DAO should now only have the proposal fee left
    assert((new BigNumber(await GENX.balanceOf.call(dao.address))).isEqualTo(new BigNumber("10e18")));
    assert((new BigNumber(await GENX.balanceOf.call(accounts[0]))).isEqualTo(balance.plus(devFund)));
  });

  it("Should support upgrading the staking contract", async () => {
    let GENX = await GenxToken.new();
    let stake = await GenxStaking.new(GENX.address);
    await GENX.transferOwnership(stake.address);
    let dao = await GenxDAO.new(stake.address);
    await stake.transferOwnership(dao.address);

    assert.equal(await GENX.owner.call(), stake.address);
    assert.equal(await dao.stake(), stake.address);

    let newStake = await GenxStaking.new(GENX.address);
    assert(stake.address !== newStake.address);

    await GENX.approve(stake.address, 1);
    await stake.increaseStake(1);
    await (new Promise((resolve) => {
      web3.currentProvider.send({
        jsonrpc: "2.0",
        method: "evm_increaseTime",
        params: [1],
        id: null
      }, resolve);
    }));

    await GENX.approve(dao.address, new BigNumber("10e18"));
    let id = (
      await dao.proposeStakeUpgrade(
        newStake.address,
        [GENX.address],
        "Info for Stake Upgrade"
      )
    ).logs[0].args.proposal;
    await dao.completeProposal(id, [accounts[0]]);

    assert.equal(await GENX.owner.call(), newStake.address);
    assert.equal(await dao.stake.call(), newStake.address);

    assert(
      (new BigNumber(
        await GENX.allowance.call(stake.address, newStake.address))
      ).isGreaterThan(
        await GENX.balanceOf.call(stake.address)
      )
    );
  });

  it("Should support upgrading itself", async () => {
    let GENX = await GenxToken.new();
    let stake = await GenxStaking.new(GENX.address);
    let dao = await GenxDAO.new(stake.address);
    await stake.transferOwnership(dao.address);
    assert(!(await dao.upgraded.call()));

    let newDAO = await GenxDAO.new(stake.address);

    await GENX.approve(stake.address, 1);
    await stake.increaseStake(1);
    await (new Promise((resolve) => {
      web3.currentProvider.send({
        jsonrpc: "2.0",
        method: "evm_increaseTime",
        params: [1],
        id: null
      }, resolve);
    }));

    await GENX.approve(dao.address, new BigNumber("10e18"));
    let id = (await dao.proposeDAOUpgrade(newDAO.address, "Info for DAO Upgrade")).logs[0].args.proposal;
    await dao.completeProposal(id, [accounts[0]]);

    // Verify the DAO successfully upgraded
    assert(await dao.upgraded.call());
    assert.equal(await dao.upgrade.call(), newDAO.address);
    assert.equal(await stake.owner.call(), newDAO.address);
    // Verify it forwarded its funds
    assert((new BigNumber("0")).isEqualTo(await GENX.balanceOf.call(dao.address)));
    assert((new BigNumber("10e18")).isEqualTo(await GENX.balanceOf.call(newDAO.address)));

    // Verify it's not usable
    await GENX.approve(dao.address, new BigNumber("10e18"));
    let failed = false;
    try {
      await dao.proposeDAOUpgrade(newDAO.address, "Info for DAO Upgrade after already upgrading");
    } catch(e) {
      failed = true;
    }
    assert(failed);
  });
});