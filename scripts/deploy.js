async function main() {

    const [deployer] = await ethers.getSigners();

    console.log(
        "Deploying contracts with the account:",
        deployer.address
    );

    console.log("Account balance:", (await deployer.getBalance()).toString());

    const AppContractFactory = await ethers.getContractFactory("AppContract");
    const AppInstance = await AppContractFactory.deploy();
    console.log("Application contract address:", AppInstance.address);

    const OracleContractFactory = await ethers.getContractFactory("Oracle");
    const OracleInstance = await OracleContractFactory.deploy();
    console.log("Oracle contract address:", OracleInstance.address);

    // set the oracle contract address inside the caller contract
    await AppInstance.setOracleInstanceAddress(OracleInstance.address);

}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

/* to run in ganache:
run --network localhost  scripts/deploy.js
Deploying contracts with the account: 0xC2a682abb97DE6833FF627905F19c080F38DF9dF
Account balance: 100000000000000000000
Caller contract address: 0xE1c05e124DA1610B9210051fC719f6E85E3a50A1
Oracle contract address: 0xA47Ef501Fd446473A8D5B4c4cA3370E7ae7F19b0
*/
