pragma solidity 0.5.0;
pragma experimental ABIEncoderV2;

import "hardhat/console.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";  // to get the Ownable "onlyOwner" modifier

contract AppContract is Ownable {

    address private oracleAddress;
    mapping(address => string[]) currentBets;  // keeps track of all current bets/odds

    function placeBet(address _senderAddress, string memory _betWithOdds) public payable{
        currentBets[_senderAddress].push(_betWithOdds);
    }

    function getBets(address _sender) external view returns (string [] memory){
        return currentBets[_sender];    }
}

