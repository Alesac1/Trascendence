// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

struct Data{
    string Name1;
    string Name2;

    uint256 Score1;
    uint256 Score2;
}

contract store_scores {
    address private owner;

    mapping (uint256 => Data) public data;

    function store(uint256 id, string memory name1, string memory name2, uint256 score1, uint256 score2) public {

        require(msg.sender == owner, "Only owner can store data");
        data[id].Name1 = name1;
        data[id].Name2 = name2;
        data[id].Score1 = score1;
        data[id].Score2 = score2;
    }

    function get_name1(uint256 id) public view returns (string memory) {
        return data[id].Name1;
    }
    function get_name2(uint256 id) public view returns (string memory) {
        return data[id].Name2;
    }
    function get_score1(uint256 id) public view returns (uint256) {
        return data[id].Score1;
    }
    function get_score2(uint256 id) public view returns (uint256) {
        return data[id].Score2;
    }

    function get_winner(uint256 id) public view returns (string memory) {
        return data[id].Score1 > data[id].Score2 ? data[id].Name1 : data[id].Name2;
    }

    constructor() {
        owner = msg.sender;
    }
}
