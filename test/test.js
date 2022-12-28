const {expect} = require("chai");
const { ethers, waffle } = require("hardhat");

describe(" Staking ",() => {
  beforeEach(async() => {
    [signer1,signer2] = await ethers.getSigners();

    Staking = await ethers.getContractFactory("Staking",signer1);
    staking = await Staking.deploy({
      value : ethers.utils.parseEther("10")
    });
  });

  describe("deploy",() => {
    it("should set Owner",async() => {
      expect(await staking.owner()).to.equals(signer1.address)
    })
    it("should set up ties and lockPeriod", async() => {
      expect(await staking.lockPeriods(0)).to.equals(30);
      expect(await staking.lockPeriods(1)).to.equals(90);
      expect(await staking.lockPeriods(2)).to.equals(180);

      expect(await staking.tiers(30)).to.equals(700);
      expect(await staking.tiers(90)).to.equals(1000);
      expect(await staking.tiers(180)).to.equals(1500);
    });
  });

  describe("stakeEthers" , async() => {
    it("should transfer ether",async() => {

      let provider = waffle.provider;


      let contractBal;
      let signerBal;
      const transferBal =  ethers.utils.parseEther("2.0");

      contractBal = await provider.getBalance(staking.address);
      signerBal = await signer1.getBalance();

      const data = { value : transferBal }
      const tx = await staking.connect(signer1).stakeEthers(30 , data);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);

      //test change in signer's ether bal
      expect(
        await signer1.getBalance()
      ).to.equals(
        signerBal.sub(transferBal).sub(gasUsed)
      )

      //test change in contract's ether bal
      expect(
        await provider.getBalance(staking.address)
      ).to.equals(
        contractBal.add(transferBal)
      )
    })

    it("should add our struck position to mapping positions", async() => {
      const provider = waffle.provider;
      let position;
      const transferAmt = ethers.utils.parseEther("1.0");

      position = await staking.positions(0)

      expect(position.positionId).to.equals(0)
      expect(position.walletAddress).to.equals("0x0000000000000000000000000000000000000000");
      expect(position.createdDate).to.equals(0)
      expect(position.unlockDate).to.equals(0)
      expect(position.percentInterest).to.equals(0)
      expect(position.weiStaked).to.equals(0)
      expect(position.weiInterest).to.equals(0)
      expect(position.open).to.equals(false)

      expect(await staking.currentPositionId()).to.equals(0);

      data = { value : transferAmt }
      const tx = await staking.connect(signer1).stakeEthers(90 , data);
      const receipt = await tx.wait();
      const block = await provider.getBlock(receipt.blockNumber);

      
      position = await staking.positions(0)

      expect(position.positionId).to.equals(0)
      expect(position.walletAddress).to.equals(signer1.address);
      expect(position.createdDate).to.equals(block.timestamp)

      expect(position.unlockDate).to.equals(block.timestamp + (86400 * 90)) // timestamp is in secs so 86400 = 1day

      expect(position.percentInterest).to.equals(1000)
      expect(position.weiStaked).to.equals(transferAmt)
      expect(position.weiInterest).to.equals(ethers.BigNumber.from(transferAmt).mul(1000).div(10000))
      expect(position.open).to.equals(true)

      expect( await staking.currentPositionId()).to.equals(1);
    })

    it("should add address and positionId to addressToPositionId", async() => {
      const txAmt = ethers.utils.parseEther("0.7");

      const data = { value : txAmt }

      await staking.connect(signer1).stakeEthers(30 , data);
      await staking.connect(signer1).stakeEthers(30 , data);
      await staking.connect(signer2).stakeEthers(90 , data);

      expect(await staking.addressToAllPositionIds(signer1.address,0) ).to.equals(0);
      expect(await staking.addressToAllPositionIds(signer1.address,1) ).to.equals(1);
      expect(await staking.addressToAllPositionIds(signer2.address,0) ).to.equals(2);
    })
  })

  describe(" ModifyLockPeriod " , () => {
    describe(" Owner " , () => {
      it("should create a new Lock period",async() => {
        await  staking.connect(signer1).modifyLockPeriods(100 , 1100);

        expect(await staking.tiers(100)).to.equals(1100)
        expect(await staking.lockPeriods(3)).to.equals(100)
      })  

      it("should create an existing Lock period",async() => {
        await  staking.connect(signer1).modifyLockPeriods(30 , 500);

        expect(await staking.tiers(30)).to.equals(500)
    
      })
    })
    describe(" NON-Owner " , () => {
      it("should revert",async() => {
         expect(staking.connect(signer2).modifyLockPeriods(100 , 1100)).to.be.revertedWith(
          "Only Owner may Modify Staking Period"
        )
      })
    })
  })

  describe(" getlockPeriods" , () => {
    it("should return all lock periods", async() => {
        const lockPeriods = await staking.getLockPeriods();

        expect(
          lockPeriods.map(v => Number(v._hex))
        ).to.eql( // eql for arrays
          [30,90,180]
        )
    } )
  })

  describe("getInterestRate",() => {
    it(" should return rate of specific lockPeriod ",async() => {
      const interestRate = await staking.getInterestRate(30);

      expect(interestRate).to.equal(700);
    })
  })

  describe(" getPositionByID " , () => {
    it('should return data about specific position,given a positionId',async() => {
      const provider = waffle.provider;

      const transferAmt = ethers.utils.parseEther("7");

      data = { value : transferAmt }

      const tx = await staking.connect(signer1).stakeEthers(90,data);

      const receipt = tx.wait();
      const block = await provider.getBlock(receipt.blockNumber);

      const position = await staking.connect(signer1.address).getPositionById(0);

      expect(position.positionId).to.equals(0)
      expect(position.walletAddress).to.equals(signer1.address);
      expect(position.createdDate).to.equals(block.timestamp)

      expect(position.unlockDate).to.equals(block.timestamp + (86400 * 90)) // timestamp is in secs so 86400 = 1day

      expect(position.percentInterest).to.equals(1000)
      expect(position.weiStaked).to.equals(transferAmt)
      expect(position.weiInterest).to.equals(ethers.BigNumber.from(transferAmt).mul(1000).div(10000))
      expect(position.open).to.equals(true)

    })
  })

  describe("getAllPositionIdsOfAddress" , () => {
    it(" should return  list of positionIds created by specific address ",async() => {
      let data;
      let tx;

      data = { value : ethers.utils.parseEther("5") }
      tx = await staking.connect(signer1).stakeEthers(30 , data)

      data = { value : ethers.utils.parseEther("10") }
      tx = await staking.connect(signer1).stakeEthers(90 , data)

      data = { value : ethers.utils.parseEther("15") }
      tx = await staking.connect(signer1).stakeEthers(180 , data)

      const positionIds = await staking.getAllPositionIdsOfAddress(signer1.address);

      expect(
        positionIds.map(p => Number(p))
      ).to.eql(
        [0,1,2]
      )

    })
  })

  describe("changeUnlockDate",() => {
    describe("owner",() => {
      it("should change unlock date ",async() => {
        const data = { value : ethers.utils.parseEther("4") }

        const tx = await staking.connect(signer2).stakeEthers(90,data);

        const oldPosition = await staking.getPositionById(0);

        const newUnlockDate = oldPosition.unlockDate - (86400 * 500)

        await staking.connect(signer1).changeUnlockDate(0 , newUnlockDate);

        const newPosition = await staking.getPositionById(0);

        expect(
          newPosition.unlockDate
        ).to.equals(
          oldPosition.unlockDate - (86400 * 500)
        )
      } )
    })
    describe("non-Owner",() => {
     it("should revert",async() => {
      const data = { value : ethers.utils.parseEther("4") }

      const tx = await staking.connect(signer2).stakeEthers(90,data);

      const oldPosition = await staking.getPositionById(0);

      const newUnlockDate = oldPosition.unlockDate - (86400 * 500)

      expect(
        staking.connect(signer2).changeUnlockDate(0 , newUnlockDate)
        ).to.be.revertedWith(
          " Only Owner may Modify Staking dates"

      )
      } )
    })
  })

  describe("closePosition",() => {
    describe("after unlock date",() => {
      it("should transfer staked amt and interest",async() => {
         let tx;
         let receipt;
         let block;
         
         const provider = waffle.provider;

         const data = { value : ethers.utils.parseEther("10") }

         tx = await staking.connect(signer2).stakeEthers(90,data)

         receipt = tx.wait();
         block = await provider.getBlock(receipt.BigNumber);

         
         const newUnlockDate = block.timestamp - (86400 * 100)

         await staking.connect(signer1).changeUnlockDate(0,newUnlockDate)

         const position = await staking.getPositionById(0)

         const signerBalBefore = await signer2.getBalance()

         tx = await staking.connect(signer2).closePosition(0)
         receipt = await tx.wait();

         const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice)
         const signerBalAfter = await signer2.getBalance();

         expect (
          signerBalAfter
         ).to.equal(
          signerBalBefore
          .sub(gasUsed)
          .add(position.weiStaked)
          .add(position.weiInterest)
         )

      })
    }) 
    describe("before unlock date",() => {
      it("should only transfer staked amt",async() => {
        let tx;
        let receipt;
        let block;
        
        const provider = waffle.provider;

        const data = { value : ethers.utils.parseEther("1") }

        tx = await staking.connect(signer2).stakeEthers(90,data)

        receipt = tx.wait();
        block = await provider.getBlock(receipt.BigNumber);


        const position = await staking.getPositionById(0)

        const signerBalBefore = await signer2.getBalance()

        tx = await staking.connect(signer2).closePosition(0)
        receipt = await tx.wait();

        const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice)
        const signerBalAfter = await signer2.getBalance();

        expect (
         signerBalAfter
        ).to.equal(
         signerBalBefore
         .sub(gasUsed)
         .add(position.weiStaked)
        )
      })
    })
  })
})