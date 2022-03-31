import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import {ethers,utils,Contract,providers} from 'ethers';
import Web3 from 'web3';
import Web3modal, { getProviderInfo } from 'web3modal';

import { NFT_MarkePlace_Abi, NFT_MarketPlace_Address, DAO_ADDRESS, dao_abi, FamilyNFTADDRSES, FAMILYNFT_ABI } from '../constants';
import { useRef, useState, useEffect } from 'react';
import { Web3Provider } from '@ethersproject/providers';
import { formatEther } from 'ethers/lib/utils';

export default function Home() {
//ETH balance of the DAO contract 
const [treasuryBalance, setTreasuryBalnce] = useState("0");
//Number of proposals created in the DAO
const [numProposals, setNumProposals] = useState("0");
//Array of all proposals created in the DAO 
const [proposals, setProposals] = useState([]);
//User's balance of FamilyNFTS 
const [nftBalance, setNftbalance] = useState(0);
//Fake NFt token ID to purchase. Used when created a proposal.
const [fakeNftTokenId, setFakeNftTokenId] = useState("");
//One of "Create Propsoal" or "View proposal"
const [selectedTab, setSelectedTab] = useState("");
//True if wating for transaction to be mined 
const [loading, setLoading] = useState(false);
//True if use has connected wallet, false otherwise
const [walletConnected, setWalletConnected] = useState(false);
const web3modalref = useRef();

//Helper function to fetch a Provider/SIgner instance from metamask 
const getProviderOrSigner = async(needSigner = false) => { 
  const provider = await web3modalref.current.connect(); 
  const web3provider = new providers.Web3Provider(provider);

  const {chainId} = await web3provider.getNetwork();
  if(chainId !==4 ) { 
    window.alert("Please connect to rinkeby network"); 

  }

  if(needSigner) { 
    const signer = web3provider.getSigner();
    return signer;
  }

  return web3provider;

};

//Helper function to connect Wallet 
const Connect = async() =>  { 
try {
    await getProviderOrSigner();
    setWalletConnected(true)
}catch(err) { 
  console.error(err)
}

};


//Reads teh ETH balance of the DAO contract and sets the "treasury Balance" state variable 
const getDAOTreasuryBalance = async() => { 
  try { 
    const provider = await getProviderOrSigner();
    const balance = await provider.getBalance(
      DAO_ADDRESS
    );
      setTreasuryBalnce(balance.toString());
  }catch(err) { 
    console.error(err);
  };
};

//Helper function that returns a DAO contract Instance 
//given a Provider/Signer 
const getDaoContractInstance = (providerOrSigner) => { 
  return new Contract(
    DAO_ADDRESS,
    dao_abi,
    providerOrSigner
  );
};
//Helper function that reurns NFT contract Instance 
const getNftContractInstance = (providerOrSigner) => { 
  return new Contract(
    FamilyNFTADDRSES,
    FAMILYNFT_ABI,
    providerOrSigner
  );
};



//Reads the number of proposals in the DAO contract and sets the "numProposals" state variable 
const getNumberProposalsInDao = async() =>  { 
  try { 
    const provider = await getProviderOrSigner();
    const contract =  getDaoContractInstance(provider);
    const daoNumProposals = await contract.numProposals();
    setNumProposals(daoNumProposals.toString());
    
  }catch(err) {
    console.error(err)
  }

};

//Reads the balance of the users FamilyNFTS and sets 'nftBalance" state var
const getUserNftBalance = async() => { 
  try  { 
    const signer = await getProviderOrSigner(true);
    const nftContract =   getNftContractInstance(signer);
    const balance = await nftContract.balanceOf(signer.getAddress());
    setNftbalance(parseInt(balance.toString()));
  }catch(err) { 
    console.error(err)
  }

};
//calls "createAProposal" function in the contract, using the tokenId from 'fakeNFttokenId"
const createProposal = async() => { 
  try { 
    const signer = await getProviderOrSigner(true);
    const daoContract = getDaoContractInstance(signer);
    const txn = await daoContract.createProposal(fakeNftTokenId);
    setLoading(true);
    await txn.wait();
    await getNumberProposalsInDao();
    setLoading(false);

  }catch(err) { 
    console.error(err)
    window.alert(err)
  }
};

//Helper function to fetch and parse one proposal from the DAO contract
//Given the propsoal ID
//and converts the returned data into a Javascript object with values we can use 
const fetchPropsoalById = async(id) => { 
  try  { 
    const provider = await getProviderOrSigner();
    const daoContract = getDaoContractInstance(provider);
    const proposal = await daoContract.proposals(id);
    const parseProposal = {
      proposalId: id, 
      nftTokenId: proposal.nftTokenId.toString(),
      deadline: new Date(parseInt(proposal.deadline.toString()) * 1000),
      yesVotes: proposal.yesVotes.toString(),
      noVotes: proposal.noVotes.toString(),
      executed: proposal.executed
    };

    return parseProposal;
  }catch(error) { 
    console.log(error);
  };

};


//Runs a loop 'numProposals' times to fetch all proposals in DAO
//and sets the 'proposals' state variable 
const fetchAllProposals = async() => { 
  try {
    const proposals = [];
    for(let i = 0; i < numProposals; i++) { 
      const proposal = await fetchPropsoalById(i);
      proposals.push(proposal);
    }
    setProposals(proposals);
console.log(proposals)
  
    return proposals
  }catch(err) { 
    console.error(error); 
  }

};

//Calls 'voteOnProposal" function from the contract, using the passed
//proposal ID and Vote 
const voteOnProposal = async(proposalId, _vote) => { 
  try  { 
    const signer = await getProviderOrSigner(true);
    const daoContract = getDaoContractInstance(signer);

    let vote = _vote === "Yes" ? 0 : 1;
    const txn = await daoContract.voteOnProposal(proposalId, vote);
    setLoading(true);
    await txn.wait();
    await fetchAllProposals(); 

  }catch(err) {
     console.error(err)
     window.alert(error.data.message);
  };
};


//Mint function get buy familyNFT 

const Mint = async() => { 
  try { 
    const signer = await getProviderOrSigner(true);
    const nftContract = new Contract(FamilyNFTADDRSES, FAMILYNFT_ABI, signer);
    //call mint FUnction
    const tx = nftContract.mint({
      value: ethers.utils.parseEther("0.01")

    })
    setLoading(true);
    await tx.wait();
    setLoading(false);
    window.alert("You just minted a NFT")

  }catch(err) { 
    console.error(err)
  }

}

 //Execute proposal function in contract,
 const executeProposal = async(proposalId)=> { 
  try { 
    const signer = await getProviderOrSigner(true);
    const daoContract = getDaoContractInstance(signer);
    const txn = await daoContract.executeProposal(proposalId);
    setLoading(true);
    await txn.wait();
    setLoading(false);
    await fetchAllProposals();

  }catch(error) { 
    console.error(error);
    window.alert(error.data.message);
  }

 };

useEffect(() => { 
  if(!walletConnected) { 
    web3modalref.current = new Web3modal({
      network: "rinkeby",
      providerOptions: {},
      disableInjectedProvider: false,
    });

    Connect().then(() => { 
      getDAOTreasuryBalance();
      getUserNftBalance();
      getNumberProposalsInDao();
    })
  }

},[walletConnected]);

//code that runs everytime teh value of "selectedTab" changes
//used to re-fetch all proposals in the DAO when user switches
//to the "view" Proposals tab
useEffect(() => { 
  if(selectedTab === "View Proposals") {
    fetchAllProposals();
  }
}, [selectedTab]);
//Render the contents of the appropiate tab based on 'selected tab'
function renderTabs() { 
  if(selectedTab === "Create Proposal") { 
    return renderCreateProposalTab();
  }else if (selectedTab === "View Proposals") {
    return renderViewPropoalsTab();
  }
  return null;
}

//Renders create Proposal Tab content
function renderCreateProposalTab(){
  if(loading) { 
    return ( 
      <div className = "description">
        Loading... Waiting for transaction
      </div>
    );
  }else if(nftBalance === 0) { 
    <div className  = "description">
      You do not own any Family NFTS <br></br>
      <b>You cannot create or vote on proposals</b>

    </div>
  } 
  else { 
    return ( 
      <div className = "container">
        <label>Fake NFT Token ID to purchase: </label>
        <input
        placeholder='0'
        type = "number"
        onChange={(e) => setFakeNftTokenId(e.target.value)}
        />
        <button className = "button2" onClick = {createProposal}>Create</button>
      </div>

    )
  }

}

//Renders the "view proposal" tab content 

function renderViewPropoalsTab() { 
  if(loading) {
    return ( 
      <div className = "description">
        Loading.. Waiting for transaction
      </div>
    );
  }else if (proposals.length === 0) { 
    return (
      <div className = "description">
        No proposals Have Been created.
      </div>
    );
    }
    else { 
      return ( 
        <div>
          {proposals.map((p, index) => (
            <div key = {index} className = "description">
                <p>Proposal ID: {p.proposalId}</p>
                <p>NFT to Purchase {p.nftTokenId}</p>
                <p>Deadline: {p.deadline.toLocaleString()}</p>
                <p>Yes Votes: {p.yesVotes}</p>
                <p>No Votes: {p.noVotes}</p>
                <p>Executed? : {p.executed.toString()}</p>
                {p.deadline.getTime() > Date.now() && !p.executed ? (
                  <div className = "flex">
                      <button onClick = {() => voteOnProposal(p.proposalId, "Yes")} className = "button2">
                        Vote Yes
                      </button>
                      <button
                    className={styles.button2}
                    onClick={() => voteOnProposal(p.proposalId, "No")}
                    >Vote No</button>
                    </div>

                ): p.deadline.getTime() < Date.now() && !p.executed ? (
                  <div>
                      <button className = "button2" onClick={() => executeProposal(p.proposalId)}>
                        Execute Proposal{" "}
                        {p.yesVotes > p.noVotes ? "(Yes)" : "(No)"}
                      </button>
                     </div>

                ): (
                  <div className='description'> Propsoal Excuted </div>

                )} 
              </div>

          ))}

        </div>
      );
    };
      
  }

function mintButton() {
  if(nftBalance >= 1) {
    return(
      <h1>
        You successfully minted a familyNFT!
      </h1>
    )
  }

  if(loading) { 
    return (
      <button>
        loading....
      </button>
    )
  }else { 
    return ( 
      <button onClick={Mint}>
        Mint an NFT!!

      </button>


    )
  }
  
}



  return (
    <div className = "main">
      <h1 className = "title"> Welcome To Family DAO</h1>
      <div className = "description">Welcome To This Dao</div>
      <div className = "description">You FamilyNFT Balance : {nftBalance}
      <br></br>
        Treasury Balance: {formatEther(treasuryBalance)} ETH
        <br></br>
        <br></br>
        Total Number Of Proposals: {numProposals}
      </div>

      <div className = "flex">
        <button
          className = "button"
          onClick = {() => setSelectedTab("Create Proposal")}
        >
          Create Proposal
        </button>
        <button
          className = "button"
          onClick  = {() => setSelectedTab("View Proposals")}
        > View Proposals</button>
      </div>
      {renderTabs()}
      <div>

      </div>

      <div>
       {mintButton()}
      </div>
    </div>
  )
}
