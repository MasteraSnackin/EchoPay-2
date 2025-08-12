const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EchoPayToken", function () {
  let EchoPayToken;
  let token;
  let owner;
  let payer;
  let recipient;
  let initialSupply;

  beforeEach(async function () {
    [owner, payer, recipient] = await ethers.getSigners();
    initialSupply = ethers.parseEther("1000000"); // 1 million tokens

    EchoPayToken = await ethers.getContractFactory("EchoPayToken");
    token = await EchoPayToken.deploy(initialSupply);
    await token.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await token.owner()).to.equal(owner.address);
    });

    it("Should assign the total supply of tokens to the owner", async function () {
      const ownerBalance = await token.balanceOf(owner.address);
      expect(await token.totalSupply()).to.equal(ownerBalance);
    });

    it("Should set the correct token name and symbol", async function () {
      expect(await token.name()).to.equal("EchoPay Token");
      expect(await token.symbol()).to.equal("EPAY");
    });
  });

  describe("Authorization", function () {
    it("Should allow owner to authorize a payer", async function () {
      await token.authorizePayer(payer.address);
      expect(await token.authorizedPayers(payer.address)).to.be.true;
    });

    it("Should allow owner to revoke a payer", async function () {
      await token.authorizePayer(payer.address);
      await token.revokePayer(payer.address);
      expect(await token.authorizedPayers(payer.address)).to.be.false;
    });

    it("Should not allow non-owner to authorize payers", async function () {
      await expect(
        token.connect(payer).authorizePayer(recipient.address)
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });
  });

  describe("Voice Transfer", function () {
    beforeEach(async function () {
      await token.authorizePayer(payer.address);
      // Transfer some tokens to the payer
      await token.transfer(payer.address, ethers.parseEther("1000"));
    });

    it("Should allow authorized payer to transfer tokens", async function () {
      const transferAmount = ethers.parseEther("100");
      const initialRecipientBalance = await token.balanceOf(recipient.address);
      const initialPayerBalance = await token.balanceOf(payer.address);

      await token.connect(payer).voiceTransfer(recipient.address, transferAmount);

      expect(await token.balanceOf(recipient.address)).to.equal(
        initialRecipientBalance + transferAmount
      );
      expect(await token.balanceOf(payer.address)).to.equal(
        initialPayerBalance - transferAmount
      );
    });

    it("Should not allow unauthorized payer to transfer tokens", async function () {
      const transferAmount = ethers.parseEther("100");
      await expect(
        token.connect(recipient).voiceTransfer(payer.address, transferAmount)
      ).to.be.revertedWith("EchoPay: Unauthorized payer");
    });

    it("Should not allow transfer to zero address", async function () {
      const transferAmount = ethers.parseEther("100");
      await expect(
        token.connect(payer).voiceTransfer(ethers.ZeroAddress, transferAmount)
      ).to.be.revertedWith("EchoPay: Invalid recipient");
    });

    it("Should not allow transfer of zero amount", async function () {
      await expect(
        token.connect(payer).voiceTransfer(recipient.address, 0)
      ).to.be.revertedWith("EchoPay: Invalid amount");
    });

    it("Should not allow transfer of amount greater than balance", async function () {
      const payerBalance = await token.balanceOf(payer.address);
      const transferAmount = payerBalance + ethers.parseEther("1");
      
      await expect(
        token.connect(payer).voiceTransfer(recipient.address, transferAmount)
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint tokens", async function () {
      const mintAmount = ethers.parseEther("1000");
      const initialBalance = await token.balanceOf(recipient.address);
      
      await token.mint(recipient.address, mintAmount);
      
      expect(await token.balanceOf(recipient.address)).to.equal(
        initialBalance + mintAmount
      );
    });

    it("Should not allow non-owner to mint tokens", async function () {
      const mintAmount = ethers.parseEther("1000");
      
      await expect(
        token.connect(payer).mint(recipient.address, mintAmount)
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });
  });

  describe("Events", function () {
    it("Should emit PayerAuthorized event", async function () {
      await expect(token.authorizePayer(payer.address))
        .to.emit(token, "PayerAuthorized")
        .withArgs(payer.address);
    });

    it("Should emit PayerRevoked event", async function () {
      await token.authorizePayer(payer.address);
      await expect(token.revokePayer(payer.address))
        .to.emit(token, "PayerRevoked")
        .withArgs(payer.address);
    });
  });
});