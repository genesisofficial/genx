let GenxToken = artifacts.require("GENX");
let GenxStaking = artifacts.require("DAO");
let GenxDAO = artifacts.require("DAO");

module.exports = async (deployer) => {
  let GENX = await deployer.deploy(GenxToken).chain;
  let stake = await deployer.deploy(GenxStaking, GENX.address);
  await GENX.transferOwnership(stake.address);

  let dao = await deployer.deploy(GenxDAO, stake.address);
  await stake.setDAO(dao.address);
  await stake.transferOwnership(dao.address);
};
