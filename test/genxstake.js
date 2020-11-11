const BigNumber = require("bignumber.js");

const GenxToken = artifacts.require("GENX");
const GenxStaking = artifacts.require("DAO");

const ONE = new BigNumber(1);
const DAY = 60 * 60 * 24;
const INITIAL = new BigNumber("2000000e18");

contract("Genesis Network Test", async (accounts) => {
  it("Should mint 2,000,000 GENX to the deployer", async () => {
    let GENX = await GenxToken.deployed();
    assert(INITIAL.isEqualTo(await GENX.totalSupply()));
    assert(INITIAL.isEqualTo(await GENX.balanceOf.call(accounts[0])));
  });

  it("Should allow staking/unstaking GENX", async () => {
    let GENX = await GenxToken.deployed();
    let stake = await GenxStaking.deployed();

    let first = new BigNumber("1000000e18");
    let next =     new BigNumber("500000e18");
    let decrease = new BigNumber("300000e18");
    let total = first.plus(next);

    await GENX.approve(stake.address, INITIAL);

    await stake.increaseStake(first);
    assert(first.isEqualTo(await stake.staked(accounts[0])));
    await stake.increaseStake(next);
    assert(total.isEqualTo(await stake.staked(accounts[0])));
    assert(INITIAL.minus(total).isEqualTo(await GENX.balanceOf.call(accounts[0])));

    await stake.decreaseStake(decrease);
    assert(total.minus(decrease).isEqualTo(await stake.staked(accounts[0])));
    await stake.decreaseStake(total.minus(decrease));
    // isZero doesn't work with returned BigNumbers
    assert((new BigNumber(0)).isEqualTo(await stake.staked(accounts[0])));
    assert(INITIAL.isEqualTo(await GENX.balanceOf.call(accounts[0])));
  });

  it("Should allow claiming GENX rewards", async () => {
    let GENX = await GenxToken.deployed();
    let stake = await GenxStaking.deployed();

    await GENX.approve(stake.address, INITIAL);
    await stake.increaseStake(INITIAL);

    // test basic staking with a one month time period
    // run twice to ensure that the last claim time was updated
    for (var i = 0; i < 2; i++) {
      // use BN 1 as the returned variable doesn't have prototypes
      let supplyAtStart = ONE.multipliedBy(await GENX.totalSupply());
      let balanceAtStart = await GENX.balanceOf.call(accounts[0]);
      let fundAtStart = await GENX.balanceOf.call(accounts[1]);

      await (new Promise((resolve) => {
        web3.currentProvider.send({
          jsonrpc: "2.0",
          method: "evm_increaseTime",
          params: [DAY * 30],
          id: null
        }, resolve);
      }));

      await stake.claimRewards();
      let mintagePiece = supplyAtStart
        // get the % of the supply given the amount of passed months
        .dividedBy(new BigNumber(25 + (i * 5)))
        // broken down further for the 5% for the devfund
        .dividedBy(new BigNumber(20));

      // ensure the staking rewards were paid
      let expected = mintagePiece.multipliedBy(new BigNumber(19)).plus(balanceAtStart);
      // allow a 1% variance due to division rounding
      assert(
        expected.minus(expected.dividedBy(100)).isLessThan(await GENX.balanceOf.call(accounts[0])) &&
        expected.plus(expected.dividedBy(100)).isGreaterThan(await GENX.balanceOf.call(accounts[0]))
      );

      // ensure the devfund was paid
      // no longer checked because the DAO test tries this
      /*
      expected = mintagePiece.plus(fundAtStart);
      assert(
        expected.minus(expected.dividedBy(100)).isLessThan(await GENX.balanceOf.call(accounts[1])) &&
        expected.plus(expected.dividedBy(100)).isGreaterThan(await GENX.balanceOf.call(accounts[1]))
      );
      */
    }
  });
});