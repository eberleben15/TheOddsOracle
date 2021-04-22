const { expect } = require('chai');
const { waffle } = require("hardhat");
const { deployContract } = waffle;
const provider = waffle.provider;

describe("AppContract", function(){
    let AppContractFactory;
    let AppInstance;

    let alice;
    let bob;

    beforeEach(async function() {
        [alice, bob] = await ethers.getSigners();
        AppContractFactory = await ethers.getContractFactory("AppContract");
        AppInstance = await AppContractFactory.deploy();
    });

    describe("Application should be able to place and show bets", function(){
        it("should be able to place a bet", async () => {
            const result = await AppInstance.placeBet("$100 on the Bills", alice.address);
            expect(result.receipt.status).to.equal(true);
            expect(result.logs[0].args).to.equal("$100 on the Bills");
        })
    })

})