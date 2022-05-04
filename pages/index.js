import { Contract, providers, utils } from "ethers";
import Head from 'next/head';
import React, { useEffect, useRef, useState } from 'react';
import Web3Modal from 'web3modal';
import { abi, NFT_CONTRACT_ADDRESS } from '../constants';
import styles from '../styles/Home.module.css'

export default function Home() {
  // walletConnected keeps track of whether the user's wallet is connected or not
  const [walletConnected, setWalletConnected] = useState(false);
  // presaleStarted keeps track of whether the presale has started or not
  const [presaleStarted, setPresaleStarted] = useState(false);
  // presaleEnded keeps track of whether the presale ended
  const [presaleEnded, setPresaleEnded] = useState(false);
  // loading is set to true when we are waiting for a transaction to get mined
  const [loading, setLoading] = useState(false);
  // checks if the currently connected MetaMask wallet is the owner of the contract
  const [isOwner, setIsOwner] = useState(false);
  // tokenIdMinted keeps track of the number of tokenIds that have been minted
  const [tokenIdsMinted, setTokenIdsMinted] = useState("0");
  // Create a reference to the Web3 Modal (used for connecting to Metamask) which
  // persist as long as the page is open
  const web3ModalRef = useRef();

  /**
   * Returns a Provider or Signer object representing Ethereum RPC with or without
   * the signing capabilities of metamask attached
   * 
   * A Provider is needed to interact with the blockhain - reading transactions, balances, state, etc
   * 
   * A Signer is Provider used in case a'write' transaction needs to be made to the 
   * blockchain, which involves the connected account needing to make the digital
   * signature to authorize the transaction being sent.
   * Metamask exposes a Signer API to allow your website to request 
   * signatures from the user using Signer functions.
   * 
   * @param {*}needSigner - True if you need the signer, default false otherwise
   */
  const getProviderOrSigner = async (needSigner=false) => {
    // Connect to Metamask
    // Since we store 'web3Modal' as a reference, we need to access the 'current'
    // value to get the access to the underlying object
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    // If user is not connected to Rinkeby network, let them know and throw an error
    const { chainId } = await web3Provider.getNetwork();
    if(chainId!==4) {
      window.alert("Change the network to Rinkeby");
      throw new Error("Change network to Rinkeby");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  /**
   * presaleMint: Mint an NFT during the presale
   */
  const presaleMint = async () => {
    try {
      // require a Signer for 'write' transaction
      const signer = await getProviderOrSigner(true);
      // create a new instance of the Contract with a Signer, which allows update methods
      const nftContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        abi,
        signer
      );
      // call the presaleMint from the contract, only whitelisted addresses would be able to mint
      const tx = await nftContract.presaleMint({
        // value signifies the cost of one crypto dev which is '0.01' eth.
        // utils.parseEther to parse string to ether
        value: utils.parseEther('0.01'),
      });
      setLoading(true);
      // await for the transaction to be mined
      await tx.wait();
      setLoading(false);
      window.alert("You successfully minted a Crypto Dev!");
    } catch (err) {
      console.error(err);
    }
  };
  /**
   * publicMint: Mint an NFT after the presale
   */
  const publicMint = async ()=> {
    try {
      // need a Signer for 'write' transaction
      const signer = await getProviderOrSigner(true);
      // create a new instance of the Contract with a Signer, which allows update methods
      const nftContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        abi,
        signer
      );
      // call the mint function from the contract to mint the Crypto Dev
      const tx = nftContract.mint({ 
        // value signifies the cost of one crypto dev
        // string is parsed into ether using utils.parseEther
        value: utils.parseEther('0.01'), 
      })
      setLoading(true);
      // wait for transaction to get mined
      await tx.wait();
      setLoading(false);
      window.alert("You successfully minted a Crypto Dev!");
    } catch (err) {
      console.error(err);
    }
  };
  /**
   * connectWallet: Connects the MetaMask wallet
   */
  const connectWallet = async() => {
    try {
      // get the provider from web3Modal (MetaMask)
      // When used for the first time, it prompts user to connect their wallet
      await getProviderOrSigner();
      setWalletConnected(true)
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * startPresale: starts the presale for the NFT Collection
   */
  const startPresale = async () => {
    try {
      // need a Signer for 'write' transaction
      const signer = await getProviderOrSigner(true);
      // Create a new instance of Contract with a signer which allows update methods
      const nftContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        abi,
        signer
      );
      // call the startPresale from the contract
      const tx = await nftContract.startPresale();
      setLoading(true);
      // wait for the transaction to get mined
      await tx.wait()
      setLoading(false);
      // set the presale started to true
      await checkIfPresaleStarted();
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * checkIfPresaleStarted: checks if the presale has started by querying 
   * the 'presaleStarted' variable in the contract
   */
  const checkIfPresaleStarted = async () => {
    try {
      // get provider from web3Modal (metamask) to read state from blockchaine
      const provider = await getProviderOrSigner();
      // connect to the contract to get read-only access
      const nftContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        abi,
        provider
      );
      // call the presaleStarted from the contract
      const _presaleStarted = await nftContract.presaleStarted();
      if (!_presaleStarted) {
        await getOwner();
      }
      setPresaleStarted(_presaleStarted);
      return _presaleStarted;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  /**
   * checkIfPresaleEnded: checks if the presale has ended by querying 
   * the 'presaleEnded' variable from contract
   */
  const checkIfPresaleEnded = async () => {
    try {
      // get provider from web3Modal, for read-only state from the blockchain
      const provider = await getProviderOrSigner();
      // connect to the contract using provider
      const nftContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        abi,
        provider
      );
      const _presaleEnded = await nftContract.presaleEnded();
      // We need to compare current time and _presaleEnded. However, _presaleEnded
      // is a Big Number, so we need to use 'lt'(less than)
      // Date.now()/1000 returns the current time in seconds
      const hasEnded = _presaleEnded.lt(Math.floor(Date.now() / 1000));
      if (hasEnded) {
        setPresaleEnded(true);
      } else {
        setPresaleEnded(false);
      }
      return hasEnded;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  /**
   * getOwner: calls the contract to retrieve the owner
   */
  const getOwner = async () => {
    try {
      // get provider from web3Modal (MetaMask) to get read access from blockchain
      const provider = await getProviderOrSigner()
      // connect to contract using provider
      const nftContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        abi,
        provider
      );
      // calls the owner function from the contract
      const _owner = await nftContract.owner();
      // get signer to extract the address of the currently connected MetaMask account
      const signer = await getProviderOrSigner(true)
      // get address associated to the signer which is connected to MetaMask
      const address = await signer.getAddress();
      if (address.toLowerCase() === _owner.toLowerCase()) {
        setIsOwner(true);
      }
    } catch (err) {
      console.error(err.message);
    }
  };

  /**
   * getTokenIdsMinted: gets the number of tokenIds that have been minted
   */
  const getTokenIdsMinted = async () => {
    try {
      // get provider from web3Modal (MetaMask) to read state from blockchain
      const provider = await getProviderOrSigner();
      // connect to nftContract using provider to get contract read access
      const nftContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        abi,
        provider
      );
      // call tokenIds frunction from contract
      const _tokenIds = await nftContract.tokenIds();
      // _tokenIds is a 'Big Number', we need to convert it to string
      setTokenIdsMinted(_tokenIds.toString());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // if wallet is not connected, create a new instance of Web3Modal and connect
    // the metamask wallet
    if (!walletConnected) {
      // Assign the Web3Modal class to the reference object by setting its 'current' value
      // The 'current' value is persisted throughout as long as the page is open
      web3ModalRef.current = new Web3Modal({
        network: 'rinkeby',
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();

      // Check if presale has started and ended
      const _presaleStarted = checkIfPresaleStarted();
      if (_presaleStarted) {
        checkIfPresaleEnded();
      }

      getTokenIdsMinted();

      // set an interval which gets called every 5 seconds to check presale has ended
      const presaleEndedInterval = setInterval(async function () {
        const _presaleStarted = await checkIfPresaleStarted();
        if (_presaleStarted) {
          const _presaleEnded = await checkIfPresaleEnded();
          if (_presaleEnded) {
            clearInterval(presaleEndedInterval);
          }
        }
      }, 5 * 1000);

      // set an interval to get the number of token Ids minted every 5 seconds
      setInterval(async function() {
        await getTokenIdsMinted();
      }, 5 * 1000);
    }
  }, [walletConnected]);

  /**
   * renderButton: Returns a button based on the state of the dapp
   */
  const renderButton = () => {
    // if wallet is not connected, return a button which allows them to connect their wallet
    if (!walletConnected) {
      return (
        <button onClick={connectWallet} className={styles.button}>
          Connect your wallet
        </button>
      );
    }

    // if waiting for transaction, return a loading button
    if (loading) {
      return <button className={styles.button}>Loading...</button>;
    }

    // if connected user is the owner, presale hasn't started yet, allow them to start the presale
    if (isOwner && !presaleStarted) {
      return (
        <button className={styles.button} onClick={startPresale}>
          Start Presale!
        </button>
      );
    }

    // if connected user is not the owner but presale hasn't started yet, tell them that
    if (!presaleStarted) {
      return (
        <div>
          <div className={styles.description}>Presale hasn't started!</div>
        </div>
      );
    }

    // if presale started and not ended yet, allow for minting during presale period
    if (presaleStarted && !presaleEnded) {
      return (
        <div>
          <div className={styles.description}>
            Presale has started! If your address is whitelisted, Mint a Crypto Dev 🥳
          </div>
          <button className={styles.button} onClick={presaleMint}>
            Presale Mint 🚀
          </button>
        </div>
      );
    }

    // if presale started and ended, it's time for public minting
    if (presaleStarted && presaleEnded) {
      return (
        <button className={styles.button} onClick={publicMint}>
          Public Mint 🚀
        </button>
      );
    }
  };

  return (
    <div>
      <Head>
        <title>Crypto Devs</title>
        <meta name="description" content="Whitelist-Dapp" />
        <link rel="icon" href="favicon.ico" type="image/x-icon" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Crypto Devs!</h1>
          <div className={styles.description}>
            It's an NFT collection for developers in Crypto.
          </div>
          <div className={styles.description}>
            {tokenIdsMinted}/20 have been minted
          </div>
          {renderButton()}
        </div>
        <div>
          <img className={styles.image} src="./cryptodevs/0.svg" alt="" />
        </div>
      </div>

      <footer className={styles.footer}>
        Made with &#10084; by Crypto Devs
      </footer>
    </div>
  );
}
