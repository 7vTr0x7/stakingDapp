//SPDX-License-Identifier: MIT
pragma solidity >=0.7.3 <0.9.0;
pragma experimental ABIEncoderV2;

contract Staking {

   address public owner;

   struct Position {
    uint256 positionId;
    address walletAddress;
    uint256 createdDate;
    uint256 unlockDate;
    uint256 percentInterest;
    uint256 weiStaked;
    uint256 weiInterest;
    bool open;
   }

   Position position;

   // increament after each new position created
   uint256 public currentPositionId;

   //to map every Position by key its stored under
   mapping(uint256 => Position) public positions;

   //to get all the position created by user
   mapping(address => uint256[]) public addressToAllPositionIds;

   //contains data of number of days and staked amount
   mapping(uint256 => uint256) public tiers;

   // stores the locking period
   uint256[] public lockPeriods;

   constructor() payable {
    owner = msg.sender;
    currentPositionId = 0;

    tiers[30] = 700;
    tiers[90] = 1000;
    tiers[180] = 1500;

    lockPeriods.push(30);
    lockPeriods.push(90);
    lockPeriods.push(180);
   }

   function stakeEthers(uint256 numDays) external payable{
    require(tiers[numDays] > 0, " Mapping not Found ");

    positions[currentPositionId] = Position(
        currentPositionId,
        msg.sender,
        block.timestamp,
        block.timestamp + (numDays * 1 days),
        tiers[numDays],
        msg.value,
        calcInterest(tiers[numDays],numDays,msg.value),
        true
    );

    addressToAllPositionIds[msg.sender].push(currentPositionId);


    currentPositionId += 1;
   }

   function calcInterest( uint256 basisPoint,uint256 numDays,uint256 weiAmount) private pure returns(uint256) {
    return basisPoint * weiAmount / 10000; // 700 * amount / 10000 = 0.7
   }

   function modifyLockPeriods(uint256 numDays,uint256 basisPoints) external {
    require(owner == msg.sender," Only Owner may Modify Staking Period ");

    tiers[numDays] = basisPoints;
    lockPeriods.push(numDays);
   }

   function getLockPeriods() external view returns(uint[] memory){
    return lockPeriods;
   }

   function getInterestRate(uint256 numDays) external view returns(uint256){
    return tiers[numDays];
   }

   function getPositionById(uint256 positionId) external view returns(Position memory){
    return positions[positionId];
   }

   function getAllPositionIdsOfAddress(address walletAddress) external view returns(uint[] memory){
    return addressToAllPositionIds[walletAddress];
   }

   function changeUnlockDate(uint256 positionId,uint256 newUnLockDate) external {
    require(owner == msg.sender," Only Owner may Modify Staking dates ");

    positions[positionId].unlockDate = newUnLockDate;
   }

   function closePosition(uint256 positionId) external {
    require(positions[positionId].walletAddress == msg.sender,"Only position creater may Modify position");
    require(positions[positionId].open == true,"Position Is Closed");

    positions[positionId].open = false;

    if(block.timestamp > positions[positionId].unlockDate){
        uint amount = positions[positionId].weiStaked + positions[positionId].weiInterest;

        payable(msg.sender).transfer(amount);
    }else{
        payable(msg.sender).transfer(positions[positionId].weiStaked);
    }
   }

}