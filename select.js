
function explorer() {

var x = document.getElementById("blockchainSelector");
var whichBlockchain = x.options[x.selectedIndex].value;

const $ = id => document.getElementById(id);
const open = (i,t) => window.open(i+t, '_blank');

var query_string = $('myInput').value;

if ($('myInput').value.length == 0)
{  	
	alert("Oops.. You forgot to enter something in the text box. Try again.");  	
	return false; 
}  
else{

var string1 = " is one of the very few blockchains not yet supported.\n\nRedirecting you to ";
var string2 = " Blockchain Explorer instead...";
let t = "";

switch(whichBlockchain) {

	case "Bitcoin":             t = $('myInput').value; open('https://www.blockchain.com/btc/address/',t); break;

	case "Ethereum":            t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;

    case "Cosmos": 				t = $('myInput').value; open('https://atomscan.com/accounts/',t); break;	
	
	case "BinanceCoin": 		t = $('myInput').value; open('https://bscscan.com/search?q=',t); break;	

	case "Ripple":              $('myInput').name="r"; $('frm').action="https://bithomp.com/explorer/"; $('frm').submit(); break;

	case "BitcoinCash": 		$('myInput').name="q"; $('frm').action="https://blockchair.com/search"; $('frm').submit(); break;

	case "Litecoin": 			$('myInput').name="q"; $('frm').action="http://explorer.litecoin.net/chain/Litecoin/search"; $('frm').submit(); break;
	
    case "EOS": 				t = $('myInput').value; open('https://eosflare.io/search/',t); break;

	case "Cardano":				t = $('myInput').value; open('https://cardanoscan.io/address/',t); break;
							
	case "Stellar": 			$('myInput').name="q"; $('frm').action="https://stellarchain.io/"; $('frm').method = "post"; $('frm').submit(); break;   							
	
    case "Neo":  				t = $('myInput').value; open('https://neotracker.io/search/',t); break;							 	
														
	case "IOTA": 				t = $('myInput').value; open('https://thetangle.org/search/',t); break;			
							
	case "Monero": 				t = $('myInput').value; open('https://xmrchain.net/search?value=',t); break;			
					
	case "Tron": 				t = $('myInput').value; open('https://tronscan.org/#/transaction/',t); break;

    case "Polkadot": 			t = $('myInput').value; open('https://polkascan.io/polkadot/analytics/search/',t); break;

    case "Uniswap": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;

    case "USDC": 				t = $('myInput').value; open('https://tronscan.org/#/transaction/',t); break;

    case "InternetComputer": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;

    case "Polygon": 			t = $('myInput').value; open('https://polygonscan.com/search?q=',t); break;

    case "Solana": 				t = $('myInput').value; open('https://explorer.solana.com/tx/',t); break;

	case "Dash": 				t = $('myInput').value; open('https://chainz.cryptoid.info/dash/search.dws?q=',t); break;
								
	case "Tether": 				t = $('myInput').value;	open('https://www.omniexplorer.info/search/'+t , '_blank'); break;
								
	case "NEM": 				t = $('myInput').value;	open('http://chain.nem.ninja/#/search/',t); break;
								
	case "EthereumClassic":     $('myInput').name="q"; $('frm').action="http://gastracker.io/"; $('frm').submit(); break; 

	case "VeChain": 			$('myInput').name="q"; $('frm').action="https://etherscan.io/search"; $('frm').submit(); break;

	case "Qtum": 				t = $('myInput').value;	open('https://qtumexplorer.io/search?q=',t); break;

	case "ICON": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;	
								
	case "Lisk": 				//see
								alert(whichBlockchain+string1+whichBlockchain+string2);
								t = $('myInput').value; open('https://explorer.lisk.io?q=',t); break;
								
	case "OmiseGO": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;	
								
	case "BitcoinGold": 		$('myInput').name="search"; $('frm').action="http://www.btgblocks.com/search"; 
								$('frm').method = "post"; $('frm').submit(); break; 
	case "Nano": 				//see
								alert(whichBlockchain+string1+whichBlockchain+string2);
								t = $('myInput').value; open('https://www.nanode.co/?search=',t); break;
								
	case "Zcash": 				//see
								alert(whichBlockchain+string1+whichBlockchain+string2);
								t = $('myInput').value; open('https://explorer.zcha.in/?search=',t); break;
	case "Ontology": 			t = $('myInput').value; open('https://neotracker.io/search/',t); break;

	case "Verge": 				$('myInput').name="search"; $('frm').action="https://verge-blockchain.info/search"; 
								$('frm').method = "post"; $('frm').submit(); break; 
								

	case "DigixDAO": 			t = $('myInput').value;							
								open('https://etherscan.io/search?q=',t); break;
	case "Populous": 			t = $('myInput').value;							
								open('https://etherscan.io/search?q=',t); break;
	case "Bytecoin": 			t = $('myInput').value; open('https://chainradar.com/xmr/search/',t); break;
								
	case "Steem": 				//see
								alert(whichBlockchain+string1+whichBlockchain+string2);
								t = $('myInput').value; open('https://steemblockexplorer.com/?q=',t); break;
								
								
	case "Stratis": 			t = $('myInput').value; 
								open('https://chainz.cryptoid.info/strat/search.dws?q=',t); break;
								
	case "Siacoin": 			//see
								alert(whichBlockchain+string1+whichBlockchain+string2);
								
								t = $('myInput').value; open('http://explore.sia.tech/?search=',t); break;	
	case "Waves": 
								t = $('myInput').value; open('https://wavesexplorer.com/address/',t); break;
								
	case "Bytom": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	
	case "RChain": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
								
	case "Bitcoin Diamond": 	//see
								alert(whichBlockchain+string1+whichBlockchain+string2);
								t = $('myInput').value; open('http://explorer.btcd.io/?q=',t); break;
								
	case "Aeternity": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
							
	case "BitShares": 			$('myInput').name="q"; $('frm').action="http://bts.ai/search"; 
								$('frm').method = "post"; $('frm').submit(); break; 
	case "Maker": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;	
	case "Augur": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
							
	case "Dogecoin": 			$('myInput').name="query"; $('frm').action="http://dogechain.info/search"; 
								$('frm').method = "post"; $('frm').submit(); 
								open('https://blocksearchengine.com' , '_blank');break;
								
	case "Waltonchain": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
								
	case "Decred": 				t = $('myInput').value; 
								open('https://explorer.dcrdata.org/search?search=',t); break;
								
	case "0x": 					t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
								
	case "Zilliqa": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
								
	case "Status": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
							
	case "Komodo": 				$('myInput').name="search"; $('frm').action="http://kmd.komodochainz.info/search"; 
								$('frm').method = "post"; $('frm').submit();
								open('https://blocksearchengine.com' , '_blank');break;
								
	case "Veritaseum": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
								
	case "Aion": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
								
	case "Hshare": 				t = $('myInput').value; open('http://explorer.h.cash?s=',t); break;
								
	case "Ardor": 				//see
								alert(whichBlockchain+string1+whichBlockchain+string2);
								t = $('myInput').value; open('https://ardorportal.org/monitor?search=',t); break;
	case "Ark": 				//see
								alert(whichBlockchain+string1+whichBlockchain+string2);							
								t = $('myInput').value; open('https://explorer.ark.io/?q=',t); break;
	case "Cryptonex": 			$('myInput').name="search"; $('frm').action="https://explorer.cryptonex.org/search"; 
								$('frm').method = "post"; $('frm').submit();
								open('https://blocksearchengine.com' , '_blank');break;
								
	case "Loopring": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	
	case "PIVX": 				t = $('myInput').value; 
								open('https://chainz.cryptoid.info/pivx/search.dws?q=',t); break;
								
	case "KucoinShares": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	
	case "QASH": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	
	case "Nebulas": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	
	case "BAT": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	
	case "DigiByte": 			t = $('myInput').value; 
								open('https://chainz.cryptoid.info/dgb/search.dws?q=',t); break;
								
	case "IOStoken": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Factom": 				//see
								alert(whichBlockchain+string1+whichBlockchain+string2);							
								t = $('myInput').value; open('https://explorer.factom.com/?search=',t); break;
	case "Golem": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;	
	case "Ethos": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;	
	case "MonaCoin": 			t = $('myInput').value; 
								open('https://mona.chainseeker.info/search/',t); break;
								
	case "Syscoin": 			t = $('myInput').value; 
								open('https://chainz.cryptoid.info/sys/search.dws?q=',t); break;
								
	case "Gas": 				t = $('myInput').value; open('https://neotracker.io/search/',t); break;
								
	case "Dragonchain": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;	
	case "GXChain": 			//see
								alert(whichBlockchain+string1+whichBlockchain+string2);
								t = $('myInput').value; open('https://block.gxb.io/?q=',t); break;	
	case "Revain": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "FunFair": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Storm": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;	
	case "Mithril": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;	
	case "Electroneum": 		t = $('myInput').value; open('https://blockexplorer.electroneum.com/search?value='+t , '_blank');  						  break;
								
	case "KyberNetwork": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;	
	case "aelf": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;	
	case "SALT": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;	
	case "Substratum": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break; 
	case "ZCoin": 				t = $('myInput').value; 
								open('https://chainz.cryptoid.info/xzc/search.dws?q=',t); break;	
	case "Request Network": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;	
	case "Kin": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;	
	case "Nxt": 				$('myInput').name="tx_search"; 
								$('frm').action="https://mynxt.info/blockexplorer/search.php"; 
								$('frm').method = "post"; $('frm').submit(); break; 
								
	case "ReddCoin": 			//see
								alert(whichBlockchain+string1+whichBlockchain+string2);
								t = $('myInput').value; open('http://live.reddcoin.com/?q=',t); break;
	case "Byteball Bytes": 		//see
								alert(whichBlockchain+string1+whichBlockchain+string2);
								t = $('myInput').value; open('https://explorer.byteball.org/?search=',t); break;
	case "Neblio": 				$('myInput').name="search"; $('frm').action="http://explorer.nebl.io/search"; 
								$('frm').method = "post"; $('frm').submit(); break; 
								
	case "Nucleus Vision": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;	
	case "Enigma": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;	
	case "ChainLink": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Power Ledger": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;	
	case "MaidSafeCoin": 		
								alert(whichBlockchain+string1+whichBlockchain+string2);
								t = $('myInput').value; open('https://omniexplorer.info/?q=',t); break;
	case "Emercoin": 			t = $('myInput').value; open('https://explorer.emercoin.com/search/',t); break;
								
	case "Dent": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;	
	case "TenX": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
								
	case "Dentacoin": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;	
	case "Bancor": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;	
	case "Credits": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;	
	case "Cindicator": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Nuls": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
								
	case "Storj": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Metal": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "MatrixAINetwork": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "XPA": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Enjin Coin": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Achain": 				//see
								alert(whichBlockchain+string1+whichBlockchain+string2);
								t = $('myInput').value; open('https://browser.achain.com/?search=',t); break;
								
	case "MinexCoin": 			//see
								alert(whichBlockchain+string1+whichBlockchain+string2);
								t = $('myInput').value; open('https://minexexplorer.com/?search=',t); break;
	case "Particl": 			t = $('myInput').value; 
								open('https://chainz.cryptoid.info/part/search.dws?q=',t); break;
	case "Polymath": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Iconomi": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Genesis Vision": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "POA Network": 		//see
								alert(whichBlockchain+string1+whichBlockchain+string2);
								t = $('myInput').value; open('https://poaexplorer.com/?search=',t); break;
	case "Genaro Network": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;	
	case "Nexus": 				//see
								alert(whichBlockchain+string1+whichBlockchain+string2);
								t = $('myInput').value; open('http://nxs.efficienthash.com/?search=',t); break;
								
	case "Cube": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Civic": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "BitcoinDark": 		//see
								$('myInput').name="q"; $('frm').action="https://www.blockexperts.com/btcd/search"; 
								$('frm').method = "post"; $('frm').submit(); break;  
	case "Aragon": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Pillar": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Vertcoin": 			t = $('myInput').value; 
								open('https://www.coinexplorer.net/VTC?search=',t); break;
	case "Decentraland": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Raiden":			 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "GameCredits": 		//see
								alert(whichBlockchain+string1+whichBlockchain+string2);
								t = $('myInput').value; 
								open('https://blockexplorer.gamecredits.com/home?search='+t , '_blank'); 
	case "Bitcore": 			t = $('myInput').value; 
								open('https://chainz.cryptoid.info/btx/search.dws?q=',t); break;	
	case "iExec RLC": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Blocknet": 			t = $('myInput').value; 
								open('https://chainz.cryptoid.info/block/search.dws?q=',t); break;	
	case "Dynamic Trading":	 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Theta Token": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Quantstamp": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "WAX": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Time New Bank": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "SingularityNET": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Oyster":			 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Gnosis": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Monaco": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "SantimentNetwork": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Skycoin": 			//see
								alert(whichBlockchain+string1+whichBlockchain+string2);
								t = $('myInput').value; open('https://explorer.skycoin.net?search=',t); break;
	case "Po.et": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Ubiq": 				//see
								alert(whichBlockchain+string1+whichBlockchain+string2);
								t = $('myInput').value; open('https://ubiqscan.io/search?=',t); break;
	case "SmartCash": 			$('myInput').name="search"; $('frm').action="https://explorer3.smartcash.cc/search"; 
								$('frm').method = "post"; $('frm').submit(); break;  
								
	case "SIRIN LABS Token": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Ignis": 				//see
								alert(whichBlockchain+string1+whichBlockchain+string2);
								t = $('myInput').value; open('https://ardorportal.org/monitor?search=',t); break;
	case "NavCoin": 			t = $('myInput').value; 
								open('https://chainz.cryptoid.info/nav/search.dws?q=',t); break;	
	case "DEW": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "ZenCash": 			//see
								alert(whichBlockchain+string1+whichBlockchain+string2);
								t = $('myInput').value; open('https://explorer.zensystem.io/?search=',t); break;
	case "Pura": 				t = $('myInput').value; 
								open('https://chainz.cryptoid.info/pura/search.dws?q=',t); break;
	case "Fusion": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Telcoin": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "CyberMiles": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Arcblock": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Gifto": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "PayPie": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "ETHLend": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Pundi X": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Edgeless": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "XTRABYTES": 			$('myInput').name="search"; $('frm').action="https://blockexplorer.xtrabytes.global/search"; 
								$('frm').method = "post"; $('frm').submit(); break;  
								
	case "HPB": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Bibox Token": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "BLOCKv": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "DigitalNote": 		t = $('myInput').value; open('https://chainradar.com/xmr/search/',t); break;
															
	case "BridgeCoin": 			t = $('myInput').value; 
								open('https://www.coinexplorer.net/BCO?search=',t); break;	
	case "Bluzelle": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "AdEx": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Asch": 				//see
								alert(whichBlockchain+string1+whichBlockchain+string2);
								t = $('myInput').value; open('https://explorer.asch.io/?search=',t); break;
	case "Envion": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "MediBloc": 			//see
								alert(whichBlockchain+string1+whichBlockchain+string2);
								t = $('myInput').value; 
								open('https://explorer.qtum.org/?search=',t); break;
	case "XP": 					t = $('myInput').value; 
								open('https://chainz.cryptoid.info/xp/search.dws?q=',t); break;
	case "SophiaTX": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Ruff": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "BOScoin": 			//see
								alert(whichBlockchain+string1+whichBlockchain+string2);
								t = $('myInput').value; open('https://bosradar.com/?search=',t); break;
	case "THEKEY": 				t = $('myInput').value; open('https://neotracker.io/search/',t); break;
	case "Loom Network": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "SaluS": 				t = $('myInput').value; 
								open('https://cryptobe.com/chain/Salus/search?q=',t); break;
	case "QRL": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "OST": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Scry.info": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Red Pulse": 			t = $('myInput').value; open('https://neotracker.io/search/',t); break;
	case "MediShares": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Ambrosus": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "QLINK": 				t = $('myInput').value; open('https://neotracker.io/search/',t); break;
	case "RCN": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "CRYPTO20": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "ION": 				t = $('myInput').value; 
								open('https://chainz.cryptoid.info/ion/search.dws?q=',t); break;
	case "Eidoo": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "SmartMesh": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "UTRUST": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "SONM": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "DATA": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Feathercoin": 		t = $('myInput').value; 
								open('https://chainz.cryptoid.info/ftc/search.dws?q=',t); break;
	case "Peercoin": 			t = $('myInput').value; 
								open('https://chainz.cryptoid.info/ppc/search.dws?q=',t); break;
	case "Modum": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "IoT Chain": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "StreamrDATAcoin":     t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "BitBay": 				t = $('myInput').value; 
								open('https://chainz.cryptoid.info/bay/search.dws?q=',t); break;
	case "AirSwap": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "DeepBrain Chain": 	t = $('myInput').value; open('https://neotracker.io/search/',t); break;
	case "VIBE": 				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Jibrel Network": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
								
	case "AppCoins": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;	
	case "Ravencoin": 			$('myInput').name="search"; $('frm').action="http://explorer.threeeyed.info/search"; 
								$('frm').method = "post"; $('frm').submit(); break;
								
	case "Crypterium": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "WePower": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "SingularDTV": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Wings": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Ormeus Coin": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Einsteinium": 	t = $('myInput').value; 
							open('https://chainz.cryptoid.info/emc2/search.dws?q=',t); break;
	case "district0x": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "SpankChain": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Melon": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "TaaS": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "INS Ecosystem": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "NAGA": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "CasinoCoin": 		$('myInput').name="search"; $('frm').action="https://explorer.casinocoin.org/search"; 
							$('frm').method = "post"; $('frm').submit(); break;					
	case "Tierion": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Rock": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Bread": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Gulden": 			alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; 
							open('https://blockchain.gulden.com?search=',t); break;
	case "HTMLCOIN": 		$('myInput').name="search"; $('frm').action="https://html.mastercalls.io/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
							
	case "TNC": 			t = $('myInput').value; open('https://neotracker.io/search/',t); break;
	case "WaBi": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Etherparty": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "OriginTrail": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Viacoin": 		//see
							t = $('myInput').value; 
							open('https://chainz.cryptoid.info/via/search.dws?q=',t); break;
							
	case "LBRY Credits": 	t = $('myInput').value; open('https://explorer.lbry.io/find?q=',t); break;
	case "Wagerr": 			//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('http://wavesgo.com/search?=',t); break;
	case "indaHash": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;	
	case "Counterparty": 	t = $('myInput').value; open('https://xchain.io/search?query=',t); break;
	case "Bottos": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Synereo": 		//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://omniexplorer.info/?q=',t); break;
	case "Triggers": 		t = $('myInput').value; open('https://xchain.io/search?query=',t); break;
	case "Universa": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "MobileGo": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
											
						
	case "BCPT": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Metaverse ETP": 	//see
	alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://explorer.mvs.org/?search=',t); break;
	case "IHT": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "SpaceChain": 		t = $('myInput').value;							
							open('https://qtumexplorer.io/search?q=',t); break;
	case "Unobtanium": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/uno/search.dws?q=',t); break;
	case "Presearch": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Delphy": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Burst": 			t = $('myInput').value; open('https://explore.burst.cryptoguru.org/search?q=',t); break;
	case "Legolas Exchange":t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Ink": 			t = $('myInput').value;							
							open('https://qtumexplorer.io/search?q=',t); break;
	case "Centra": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Soarcoin": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Game.com": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Aeon": 			t = $('myInput').value; open('https://chainradar.com/aeon/search/',t); break;
							
	case "CloakCoin": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/cloak/search.dws?q=',t); break;
	case "Blox": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "KickCoin": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Havven": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "bitCNY": 			//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('http://cryptofresh.com/a/CNY?search=',t); break;
	case "Groestlcoin": 	t = $('myInput').value; 
							open('https://chainz.cryptoid.info/grs/search.dws?q=',t); break;
	case "Nimiq":    		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Mobius": 			//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://steexp.com/?search=',t); break;
							
	case "Humaniq": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Crown": 			t = $('myInput').value; 
							open('https://chainz.cryptoid.info/crw/search.dws?q=',t); break;
	case "Elastic": 		$('myInput').name="input"; $('frm').action="http://elasticexplorer.org/search/"; 
							$('frm').method = "post"; $('frm').submit(); break;   	
	case "Unikoin Gold":  	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "TomoChain": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Viberate": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Monetha": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Mooncoin": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/moon/search.dws?q=',t); break;
	case "Namecoin": 		t = $('myInput').value; open('https://namecha.in/search?query=',t); break;
	case "Odyssey": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "CPChain": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "UpToken": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "SunContract": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "PotCoin": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/pot/search.dws?q=',t); break;
	case "Hive Project": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Lunyr": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "YOYOW": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "LEOcoin": 		//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://insight.leocoin.org?search=',t); break;
	case "Flash": 			//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://explorer.flashcoin.io/?search=',t); break;
	case "DeepOnion": 		$('myInput').name="search"; $('frm').action="http://explorer.deeponion.org/search"; 
							$('frm').method = "post"; $('frm').submit(); break;   		
	case "TokenCard": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Shift": 			//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://explorer.shiftnrg.org/?search=',t); break;
	case "Fortuna": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Pepe Cash": 		t = $('myInput').value; open('https://xchain.io/search?query=',t); break;
	case "Decision Token": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Medicalchain": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Everex": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "DECENT": 			//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://decent-db.com/?search=',t); break;
	case "Datum": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Bean Cash": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/bean/search.dws?q=',t); break;
	case "STK": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Cofound.it": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Matryx": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Blockport": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "SXDT": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "RepublicProtocol":t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "U.CASH": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "INT": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Linda": 			$('myInput').name="search"; $('frm').action="http://193.70.109.114:6005/search"; 
							$('frm').method = "post"; $('frm').submit(); break;   		
	case "Bankex": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Electrify.Asia": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Zeepin": 			t = $('myInput').value; open('https://neotracker.io/search/',t); break;
	case "All Sports": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "adToken": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "WhiteCoin": 		t = $('myInput').value; 
							open('http://explorer.whitecoin.info/chain/Whitecoin/search?q=',t); break;
	case "Steem Dollars": 	//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://steemblockexplorer.com/?q=',t); break;
	case "Safex": 			t = $('myInput').value;							
							open('https://www.omniexplorer.info/search/'+t , '_blank'); break;
	case "Diamond": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/dmd/search.dws?q=',t); break;
							//dSV2PaouE6FMUBGYbY3KKEGyagp4hRxbXY
	case "Dai": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "I/O Coin": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/ioc/search.dws?q=',t); break;
	case "ATMChain": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Refereum": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "BlackCoin": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/blk/search.dws?q=',t); break;							
	case "Peerplays": 		//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://peerplaysdb.com?search=',t); break;
	case "Numeraire": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "NoLimitCoin": 	//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('http://nolimitcoin.info/?search=',t); break;
	case "Uquid Coin": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "ECC": 			t = $('myInput').value; 
							open('https://chainz.cryptoid.info/ecc/search.dws?q=',t); break;	
	case "E-Dinar Coin": 	//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://blockchain.mn/?search=',t); break;
	case "GridCoin": 		$('myInput').name="query"; $('frm').action="https://www.gridcoinstats.eu/search.php"; 
							$('frm').method = "post"; $('frm').submit(); break;
							
	case "SIBCoin": 		$('myInput').name="q"; $('frm').action="https://chain.sibcoin.net/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
	case "YEE": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Grid+": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Mercury": 		//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('http://wavesgo.com/search?=',t); break;
	case "BitClave": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "WeTrust": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Lykke": 			//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://blockchainexplorer.lykke.com/?search=',t); break;
	case "Storiqa": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "MDA": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Zap": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Alphacat": 		t = $('myInput').value; open('https://neotracker.io/search/',t); break;
	case "SwftCoin": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "SwissBorg": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Dimecoin": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/dime/search.dws?q=',t); break;
	case "RevolutionVR": 	//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('http://blockexplorer.revolutionvr.live/search?=',t); break;
	case "Mothership": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "VeriCoin": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/vrc/search.dws?q=',t); break;
	case "FirstBlood": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Primecoin": 		t = $('myInput').value; open('https://bchain.info/XPM/search?search=',t); break;
	case "Agrello": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Banyan Network": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Aeron": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Selfkey": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "MonetaryUnit": 	t = $('myInput').value; 
							open('https://chainz.cryptoid.info/mue/search.dws?q=',t); break;
	case "Bloom": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Zeusshield": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "QunQun": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Matchpool": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;	
	case "PRIZM": 			//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('http://blockchain.prizm.space/index.html?q=',t); break;
	case "ZClassic": 		//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://zcl-explorer.com/insight?search=',t); break;
	case "Propy": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "carVertical": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "ERA": 			$('myInput').name="search"; $('frm').action="http://era.cryptonode.online/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
	case "Trade Token": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Cappasity": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Pascal Coin": 	t = $('myInput').value; open('http://explorer.pascalcoin.org/index.php?q=',t); break;	
	case "DADI": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Datawallet": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Paypex": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "bitUSD": 			$('myInput').name="q"; $('frm').action="http://bts.ai/search"; 
							$('frm').method = "post"; $('frm').submit(); break; 
	case "OAX": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "ICOS": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Omni": 			t = $('myInput').value;							
							open('https://www.omniexplorer.info/search/'+t , '_blank'); break;
	case "SHIELD": 			$('myInput').name="search"; $('frm').action="https://altmix.org/coins/2-SHIELD/explorer"; 
							$('frm').method = "post"; $('frm').submit(); break;
							//SNtyFf9Wque8PskLr78tC9v9tWgYwRqXq9
	case "Phore": 			t = $('myInput').value; 
							open('https://chainz.cryptoid.info/phr/search.dws?q=',t); break;
	case "COSS": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "LATOKEN": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Lympo": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "SolarCoin": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/slr/search.dws?q=',t); break;
	case "EncrypGen": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "FairCoin": 		t = $('myInput').value; open('https://chain.fair.to/search?sterm=',t); break;
	case "Paragon": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Expanse": 		//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://gander.tech/?search=',t); break;
	case "Lamden": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Radium": 			t = $('myInput').value; 
							open('https://chainz.cryptoid.info/rads/search.dws?q=',t); break;						
	case "Qbao": 			t = $('myInput').value;							
							open('https://qtumexplorer.io/search?q=',t); break;
	case "Energo": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "InsurePal": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "HiMutualSociety": t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "CanYaCoin": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "BitDegree": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Covesting": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Zoin": 			t = $('myInput').value; 
							open('https://chainz.cryptoid.info/zoi/search.dws?q=',t); break;
	case "MyBit Token": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "ShipChain": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "OracleChain": 	//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('http://cryptofresh.com/a/OCT?search=',t); break;
	case "Blackmoon": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Swarm": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "ColossusXT": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/colx/search.dws?q=',t); break;
	case "Databits": 		t = $('myInput').value; open('https://xchain.io/search?query=',t); break;
	case "Blocktix": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Electra": 		t = $('myInput').value; open('https://cryptobe.com/chain/Electra/search?q=',t); break;	
	case "Incent": 			//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('http://wavesgo.com/search?=',t); break;	
	case "Exchange Union": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Bodhi": 			t = $('myInput').value;							
							open('https://qtumexplorer.io/search?q=',t); break;
	case "Mintcoin": 		//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://prohashing.com/explorer/Mintcoin/?search=',t); break;
	case "ALIS": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Snovio": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Xaurum": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;	
	case "ALQO": 			//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://explorer.alqo.org/overview?search=',t); break;
	case "Eroscoin": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "FlorinCoin": 		//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://prohashing.com/explorer/Florincoin?search=',t); break;
	case "Spectrecoin": 	t = $('myInput').value; 
							open('https://chainz.cryptoid.info/xspec/search.dws?q=',t); break;
	case "iXledger": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "LoMoCoin": 		$('myInput').name="search"; $('frm').action="https://explorer.lomocoin.com/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
	case "TE-FOOD": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "DomRaider": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Everus": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Energycoin": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/enrg/search.dws?q=',t); break;
	case "BitSend": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/bsd/search.dws?q=',t); break;
	case "Clams": 			t = $('myInput').value; open('http://khashier.com/chain/Clam/search?q=',t); break;
	case "ProChain": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "MWAT": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Rivetz": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "NewYorkCoin": 	$('myInput').name="search"; $('frm').action="https://explorer.nycoin.community/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
	case "Neumark": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;

	case "Rise": 			//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://explorer.rise.vision/?search=',t); break;
	case "DecentBet": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Tao": 			$('myInput').name="search"; $('frm').action="http://www.taoexplorer.com/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
							
	case "Cashaa": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Olympus Labs": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "WavesCommunity": 	//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('http://wavesgo.com/search?=',t); break;	
	case "BitConnect": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/bcc/search.dws?q=',t); break;
	case "SureRemit": 		//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://stellar.expert/explorer/public?search=',t); break;
	case "EchoLink": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Rubycoin": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/rby/search.dws?q=',t); break;
	case "Divi": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "AICHAIN":	   		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Swarm City": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Oxycoin": 		//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://explorer.oxycoin.io?search=',t); break;
	case "ATN": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "TransferCoin": 	t = $('myInput').value; 
							open('https://chainz.cryptoid.info/tx/search.dws?q=',t); break;
	case "Target Coin": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "ProfileUtility": 	t = $('myInput').value;							
							open('https://qtumexplorer.io/search?q=',t); break;
	case "ToaCoin": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/toa/search.dws?q=',t); break;
	case "Debitum Network": t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "CoinMeet": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "CoinFi": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "PoSW Coin": 		//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://poswallet.com/blockChain/posw?search=',t); break;
	case "Musicoin": 		//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://orbiter.musicoin.org/home?search=',t); break;
	case "NVO": 			t = $('myInput').value; open('https://xchain.io/search?query=',t); break;
	case "Bitcoin Atom": 	$('myInput').name="query"; $('frm').action="https://explorer.bitcoinatom.io/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
	case "DubaiCoin": 		//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://dbixscan.io/home?search=',t); break;
	case "Rialto": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "BitDice": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Boolberry": 		t = $('myInput').value; open('https://chainradar.com/bbr/search/',t); break;
	case "EarthCoin": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/eac/search.dws?q=',t); break;
	case "OpenTrading": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "ATBCoin": 		//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://explorer.atbcoin.com?search=',t); break;
	case "Myriad": 			t = $('myInput').value; 
							open('https://chainz.cryptoid.info/xmy/search.dws?q=',t); break;
	case "Stox": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Quantum": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "NeosCoin": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/neos/search.dws?q=',t); break;
	case "Aurora DAO": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "OKCash": 			t = $('myInput').value; 
							open('https://chainz.cryptoid.info/ok/search.dws?q=',t); break;
	case "FidentiaX": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Hacken": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "LockChain": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "HelloGold": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Worldcore": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "HAC": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "bitqy": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "TokenClub": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "DIMCOIN": 		//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://dimexplorer.io/?search=',t); break;
	case "GoByte": 			$('myInput').name="search"; $('frm').action="http://gobyte.ezmine.io/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
	case "Patientory": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "InvestFeed": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "OneRoot Network": t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Karma": 			//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://krm-db.com?search=',t); break;
	case "Nexium": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "SportyCo": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Chronobank": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Solaris": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/xlr/search.dws?q=',t); break;
	case "B2BX": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Primas": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "CoinPoker": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Gambit": 			t = $('myInput').value; 
							open('https://chainz.cryptoid.info/gam/search.dws?q=',t); break;
	case "True USD": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "AirToken": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "EZToken": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Polybius": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Zilla": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;	
	case "Dynamic": 		$('myInput').name="search"; $('frm').action="http://dyn.blocksandchain.com/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
	case "Ties.DB": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "FoldingCoin": 	t = $('myInput').value; open('https://xchain.io/search?query=',t); break;
	case "Pandacoin": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/pnd/search.dws?q=',t); break;
	case "aXpire": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "HubiiNetwork":	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "LUXCoin": 		$('myInput').name="search"; $('frm').action="https://explorer.luxcore.io/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
	case "Golos": 			//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://explorer.golos.io?search=',t); break;
	case "Ink Protocol":	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "IPBC": 			//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://explorer.ipbc.io/?search=',t); break;
	case "Novacoin": 		t = $('myInput').value; open('https://explorer.novaco.in/search.php?text=',t); break;
	case "Sphere": 			$('myInput').name="search"; $('frm').action="https://sphr.network/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
	case "Mysterium": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "LALA World": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Sequence": 		$('myInput').name="search"; $('frm').action="http://seq.blocksandchain.com/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
							//bbdfcefbc6160148dfcdfdd10d10c4d62f214f3b44b527dffa8fbb65001e8733
	case "Viuly": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Etheroll": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "DopeCoin": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/dope/search.dws?q=',t); break;
	case "Tokes": 			//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://tokesplatform.org/search?=',t); break;	
	case "Bounty0x": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Block Array": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Aventus": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "PinkCoin": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/pink/search.dws?q=',t); break;
	case "Change": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "ClearPoll": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "HydroProtocol": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	
	case "BLUE": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Leadcoin": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "GET Protocol": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Bitcrystals": 	t = $('myInput').value; open('https://xchain.io/search?query=',t); break;
	case "Elixir": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Stealthcoin": 	t = $('myInput').value; 
							open('https://chainz.cryptoid.info/xst/search.dws?q=',t); break;
	case "CHIPS": 			$('myInput').name="search"; $('frm').action="http://explorer.chips.cash/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
	case "COVAL": 			t = $('myInput').value; open('https://xchain.io/search?query=',t); break;
	case "Pirl": 			alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; 
							open('https://poseidon.pirl.io/explorer?search=',t); break;
	case "Remme": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Dotcoin": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/dot/search.dws?q=',t); break;
	case "Curecoin": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/cure/search.dws?q=',t); break;
	case "Pluton": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Elite": 			t = $('myInput').value; 
							open('https://chainz.cryptoid.info/1337/search.dws?q=',t); break;
	case "APX": 			//delete
	case "Ethorse": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "IOP": 			//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('http://mainnet.iop.cash/?search=',t); break;
	case "Insights Network":t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "AidCoin": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "REBL": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "LIFE": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Atmos": 			t = $('myInput').value; 
							open('https://chainz.cryptoid.info/atms/search.dws?q=',t); break;
	case "OBITS": 			//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; 
							open('http://cryptofresh.com/a/OBITS?search=',t); break;
	case "GeoCoin": 		//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://ubiqscan.io/search?=',t); break;
	case "BABB": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "TrueFlip": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "CargoX": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "EventChain": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Bulwark": 		//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; 
							open('https://explorer.bulwarkcrypto.com?search=',t); break;
	case "ArtByte": 		//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('http://explorer.artbyte.me/?search=',t); break;
	case "Sether": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "eBitcoin": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;


	case "BioCoin": 		$('myInput').name="search"; $('frm').action="http://block-explorer.biocoin.bio/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
	case "Farad": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "PrimalbaseToken": //see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('http://wavesgo.com/search?=',t); break;

							
	case "NuBits": 			//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://explorer.nubits.com?search=',t); break;
							
	case "FedoraCoin": 		$('myInput').name="search"; $('frm').action="https://tipsbe.netcraft.ch/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
	case "Zeitcoin": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/zeit/search.dws?q=',t); break;

	case "Pareto Network": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "RefToken": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;	
	case "DAO.Casino": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Astro": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Bitmark": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/btm/search.dws?q=',t); break;
	case "Kore": 			t = $('myInput').value; 
							open('https://chainz.cryptoid.info/kore/search.dws?q=',t); break;
	case "Denarius": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/dnr/search.dws?q=',t); break;
	case "Qwark": 			//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://ubiqscan.io/search?=',t); break;
	case "Polis": 			$('myInput').name="search"; $('frm').action="https://explorer.polispay.org/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
	case "Playkey": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Breakout Stake": 	//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; 
							open('https://chain.breakoutcoin.com/BlockCrawler/block_crawler.php?search=',t); break;
	case "Memetic": 		$('myInput').name="search"; $('frm').action="http://explorer.memetic.ai/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
	case "Gatcoin": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "BlockCAT": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	
	case "EthereumMovie": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "ExclusiveCoin": 	t = $('myInput').value; 
							open('https://cryptobe.com/chain/ExclusiveCoin/search?q=',t); break;	
	case "Payfair": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Synergy": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/snrg/search.dws?q=',t); break;
	case "Flixxo": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Opus": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Terracoin": 		//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://insight.terracoin.io?search=',t); break;
	case "BitcoinZ": 		$('myInput').name="search"; $('frm').action="https://btczexplorer.blockhub.info/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
							//e7dbb59a930fe8b43f45199212e0414c77a007728eb80d9bc3992c38b1487a60
	case "Voise": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "GoldMint": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;	
	case "Bezop": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "GCR": 			t = $('myInput').value; 
							open('https://chainz.cryptoid.info/gcr/search.dws?q=',t); break;
	case "HollyWoodCoin": 	$('myInput').name="search"; $('frm').action="http://chain.hollywoodcoin.biz/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
	case "Hush": 			//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://explorer.myhush.org?search=',t); break;
	case "Bitcloud": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/btdx/search.dws?q=',t); break;
	case "Graft": 			t = $('myInput').value; open('https://blockexplorer.graft.network/search?value=',t); break;
	case "Vezt": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Dovu": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "LEDU": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Devery": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Sumokoin": 		t = $('myInput').value; open('https://explorer.sumokoin.com/search?value=',t); break;
	case "Bitcoin Plus": 	$('myInput').name="search"; $('frm').action="http://block.bitcoinplus.org/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
	case "Iungo": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Publica": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "VeriumReserve": 	t = $('myInput').value; 
							open('https://chainz.cryptoid.info/vrm/search.dws?q=',t); break;
	case "Experty": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Sociall": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "AdShares": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Smartlands": 		//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://stellar.expert/explorer/public?search=',t); break;
	case "HEROcoin": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "BunnyCoin": 		$('myInput').name="search"; $('frm').action="http://bunnycoin.thecryptochat.net/search	"; 
							$('frm').method = "post"; $('frm').submit(); break;
							//42aecedf27997870d9bd53f036b91deca258b133438b3da831018bf508e9bb45
	case "Leverj": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Internxt": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Cryptopay": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Nework": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Tracto": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Hawala.Today": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Travelflex": 		$('myInput').name="search"; $('frm').action="https://explorer.travelflex.org/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
	case "Bela": 			t = $('myInput').value; 
							open('https://chainz.cryptoid.info/bela/search.dws?q=',t); break;
	case "Breakout": 		//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; 
							open('https://chain.breakoutcoin.com/BlockCrawler/block_crawler.php?search=',t); break;
	case "Tokenbox": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Masternodecoin": 	$('myInput').name="search"; $('frm').action="http://mtnc.snodo.de:3001/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
	case "FLiK": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "LOCIcoin": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Riecoin": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/ric/search.dws?q=',t); break;
	case "EuropeCoin": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/erc/search.dws?q=',t); break;
	case "DNotes": 			t = $('myInput').value; 
							open('https://chainz.cryptoid.info/note/search.dws?q=',t); break;
	case "GoldCoin": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/gld/search.dws?q=',t); break;
	case "LuckChain": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/bash/search.dws?q=',t); break;
	case "JET8": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Upfiring": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Bonpay": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Sprouts": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/sprts/search.dws?q=',t); break;
	case "1World": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "vTorrent": 		$('myInput').name="search"; $('frm').action="http://vtrchains.com/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
							
	case "Mercury Protocol": t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "CampusCoin": 		$('myInput').name="search"; $('frm').action="http://explorer.campuscoinproject.org/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
	case "PiplCoin": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Lampix": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Obsidian": 		t = $('myInput').value; 
							open('https://blockexplorer.obsidianplatform.com/search?id=',t); break;
	case "Autonio": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Quark": 			t = $('myInput').value; 
							open('https://chainz.cryptoid.info/qrk/search.dws?q=',t); break;
	case "Monoeci": 		$('myInput').name="search"; $('frm').action="http://block.monacocoin.net:8080/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
							
	case "SHP": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "CryptoPing": 		//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('http://wavesgo.com/search?=',t); break;
	case "XGOX": 			$('myInput').name="search"; $('frm').action="http://173.254.204.74:12313/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
							
	case "CannabisCoin": 	t = $('myInput').value; 
							open('https://chainz.cryptoid.info/cann/search.dws?q=',t); break;
	case "Dether": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Aigang": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "LatiumX": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "NobleCoin": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/nobl/search.dws?q=',t); break;
	case "Yocoin": 			//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://yoscan.io?search=',t); break;
	case "ShareX": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "COPYTRACK": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "TrezarCoin": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/tzc/search.dws?q=',t); break;
	case "Magnet": 			//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('http://explorer.magnetwork.io?search=',t); break;
	case "EXRNchain": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Monkey Project": 	$('myInput').name="search"; $('frm').action="http://explorer.monkey.community/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
	case "Jiyo": 			$('myInput').name="search"; $('frm').action="http://explore.jiyo.io/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
	case "Crave": 			$('myInput').name="search"; $('frm').action="http://cryptoblock.xyz:30005/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
	case "Sharechain": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "HunterCoin": 		t = $('myInput').value; 
							open('https://www.huntercoin.info/blockExplorer/search?blockSearch=',t); break;
	case "REX": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "MCAP": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Privatix": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;



	case "Creditbit": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Blitzcash": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/blitz/search.dws?q=',t); break;
	case "ATLANT": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Zephyr": 			//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; 
							open('http://cryptofresh.com/a/ZEPH?search=',t); break;
	case "FORCE": 			$('myInput').name="search"; $('frm').action="https://explorer.forcenetwork.io/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
	case "Verify": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Innova": 			$('myInput').name="search"; $('frm').action="http://explorer.innovacoin.info/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
	case "Ethbits": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "eBoost": 			$('myInput').name="q"; $('frm').action="https://www.blockexperts.com/ebst/search"; 
							$('frm').method = "post"; $('frm').submit(); break;						
	case "EverGreenCoin": 	$('myInput').name="search"; $('frm').action="http://69.141.235.64:4001/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
	case "Creativecoin": 	t = $('myInput').value; 
							open('https://chainz.cryptoid.info/crea/search.dws?q=',t); break;

	case "MyWish": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "SagaCoin": 		$('myInput').name="search"; $('frm').action="http://explorer.sagacoin.net/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
	case "SpreadCoin": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/spr/search.dws?q=',t); break;
	case "ChainCoin": 		$('myInput').name="search"; $('frm').action="http://104.238.153.140:3001/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
	case "e-Gulden": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/efl/search.dws?q=',t); break;
	case "Rupaya": 			$('myInput').name="search"; $('frm').action="https://node2.rupayacoin.org/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
	case "TeslaCoin": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/tes/search.dws?q=',t); break;
	case "LiteDoge": 		$('myInput').name="search"; $('frm').action="http://ldoge.miningalts.com/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
							
	case "Coinlancer": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Sexcoin": 		t = $('myInput').value; 
							open('http://blockexplorer.lavajumper.com/chain/Sexcoin/search?q=',t); break;
	case "MicroMoney": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "PutinCoin": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/put/search.dws?q=',t); break;
	case "DigiPulse": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Bitzeny": 		//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://zeny.insight.monaco-ex.org?search=',t); break;
	case "Qvolta": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "BitWhite": 		t = $('myInput').value; open('https://bitwhite.info/?search=',t); break;
	case "Linx": 			t = $('myInput').value; 
							open('https://chainz.cryptoid.info/linx/search.dws?q=',t); break;
	case "GCN Coin": 		t = $('myInput').value; open('http://www.gcnchain.com/chain/GCoin/search?q=',t); break;
	case "Bullion": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/cbx/search.dws?q=',t); break;
	case "SpeedMining": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;	
	case "Jesus Coin": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Condensate": 		$('myInput').name="search"; $('frm').action="http://condensate.io/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
	case "Global Jobcoin": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;	
	case "Rupee": 			$('myInput').name="q"; $('frm').action="https://www.blockexperts.com/rup/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
	case "Magi": 			t = $('myInput').value; 
							open('https://chainz.cryptoid.info/xmg/search.dws?q=',t); break;
	case "Greencoin": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/gre/search.dws?q=',t); break;
	case "Indorse Token": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "LendConnect": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Ellaism": 		$('myInput').name="search"; $('frm').action="https://explorer.ellaism.org/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
	case "Wild Crypto": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "BuzzCoin": 		$('myInput').name="search"; $('frm').action="https://explorer.buzzcoin.info/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
							
	case "FlypMe": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "EquiTrader": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/eqt/search.dws?q=',t); break;

	case "ProCurrency": 	t = $('myInput').value; 
							open('https://cryptobe.com/chain/ProCurrency/search?q=',t); break;							
	case "IntenseCoin": 	t = $('myInput').value; open('http://intensecoin.com:8081/search?value=',t); break;
	case "STRAKS": 			//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://straks.info?search=',t); break;
	case "SkinCoin": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Pylon Network": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "GCC": 			t = $('myInput').value; 
							open('http://144.76.113.28/chain/TheGCCcoin/search?q=',t); break;
	case "VIVO": 			t = $('myInput').value; 
							open('https://chainz.cryptoid.info/vivo/search.dws?q=',t); break;
	case "UnbreakableCoin": $('myInput').name="q"; $('frm').action="https://www.blockexperts.com/unb/search"; 
							$('frm').method = "post"; $('frm').submit(); break;  
	case "Ignition": 		$('myInput').name="search"; $('frm').action="http://explorer.ignitioncoin.org/search"; 
							$('frm').method = "post"; $('frm').submit(); break;  
							
	case "DigitalPrice": 	$('myInput').name="search"; $('frm').action="http://cryptoblock.xyz:30003/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
	case "DraftCoin": 		$('myInput').name="search"; $('frm').action="http://explorer.btcdraft.com/search"; 
							$('frm').method = "post"; $('frm').submit(); break;  							
	case "HOLD": 			$('myInput').name="search"; $('frm').action="http://explorer.interstellarcoin.com/search"; 
							$('frm').method = "post"; $('frm').submit(); break; 
							
	case "Chronologic": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "onG.social": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "MAZA": 			t = $('myInput').value; 
							open('https://explorer.coinpayments.net/search.php?chain=11&q=',t); break;
	case "PlusCoin":  		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Universe": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/uni/search.dws?q=',t); break;
	case "Unitus": 			//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; 
							open('https://explorer.unitus.online?search=138148',t); break;
	case "ArcticCoin": 		$('myInput').name="search"; $('frm').action="http://explorer.arcticcoin.org/search"; 
							$('frm').method = "post"; $('frm').submit(); break; 
	case "ELTCOIN": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "CrowdCoin": 		$('myInput').name="search"; $('frm').action="http://94.130.35.230:3001/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
	case "BiblePay": 		$('myInput').name="search"; $('frm').action="https://explorer.biblepay-central.org/search"; 
							$('frm').method = "post"; $('frm').submit(); break; 
							
	case "Pure": 			//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('http://purexplorer.dynu.net/?search=',t); break;
	case "WorldCoin": 		t = $('myInput').value; open('https://www.wdcexplorer.com/search?q=',t); break;
	case "Sense": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Zetacoin": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/zet/search.dws?q=',t); break;
	case "Photon": 			t = $('myInput').value; 
							open('https://chainz.cryptoid.info/pho/search.dws?q=',t); break;
	case "Woodcoin": 		t = $('myInput').value; 
							open('https://explorer.woodcoin.org/chain/Woodcoin/search?q=',t); break;
	case "FundYourselfNow": t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "bitJob": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Capricoin": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/cpc/search.dws?q=',t); break;
	case "DeusCoin": 		//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('http://explorer.deuscoin.org?search=',t); break;
	case "Embers": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "ACC": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Ace":  			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Moin": 			$('myInput').name="search"; $('frm').action="http://explorer.discovermoin.com/search"; 
							$('frm').method = "post"; $('frm').submit(); break; 
	case "Argentum": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/arg/search.dws?q=',t); break;					
	case "MagicCoin": 		$('myInput').name="search"; $('frm').action="http://explorer.magiccoin.io:3001/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
	case "Tigereum": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "PlatinumBAR": 	$('myInput').name="search"; $('frm').action="http://xptx.io/search"; 
							$('frm').method = "post"; $('frm').submit(); break; 
	case "Canada eCoin": 	$('myInput').name="search"; $('frm').action="https://explorer.canadaecoin.ca/search"; 
							$('frm').method = "post"; $('frm').submit(); break; 
							
	case "Etheriya": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "MaxCoin": 		$('myInput').name="search"; $('frm').action="https://explorer.maxcoinproject.net/search"; 
							$('frm').method = "post"; $('frm').submit(); break; 

	case "CDX":				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "DRP Utility": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "CryptoCarbon": 	//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; 
							open('https://explorer.cryptocarbon.co.uk?search=',t); break;
	case "Shekel": 			$('myInput').name="search"; $('frm').action="http://shekelchain.com/search"; 
							$('frm').method = "post"; $('frm').submit(); break; 
	case "NEVERDIE": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Centurion": 		$('myInput').name="search"; $('frm').action="http://www.centurionexplorer.com/search"; 
							$('frm').method = "post"; $('frm').submit(); break; 
	case "Unify": 			//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://unifyexplorer.com/?search=',t); break;
	case "Sovereign Hero": 	//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; 
							open('http://cryptofresh.com/a/HERO?search=',t); break;
	case "GanjaCoin": 		$('myInput').name="search"; $('frm').action="http://ganja.bilbotel.fr/search"; 
							$('frm').method = "post"; $('frm').submit(); break;
	case "Fantomcoin": 		t = $('myInput').value; open('https://chainradar.com/fcn/search/',t); break;
	case "WandX": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "FujiCoin": 		//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('http://explorer.fujicoin.org?search=',t); break;
	case "Bytecent": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/byc/search.dws?q=',t); break;
	case "Authorship": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Hexx": 			t = $('myInput').value; 
							open('https://chainz.cryptoid.info/hxx/search.dws?q=',t); break;
	case "Guncoin": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/gun/search.dws?q=',t); break;
	case "Zennies": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "ArbitrageCT": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Megacoin": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/mec/search.dws?q=',t); break;
							//MVs3EzxUPzWYmohPwvTAqHXsVDG4LgSQ9X
	case "Legends Room": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "EtherSportz": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Bitdeal": 		//delete
	case "Ethereum Cash": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "EthBet": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Kubera Coin": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Soma": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Startcoin": 		//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('http://explorer.startcoin.org?search=',t); break;
	case "Jetcoin": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Trollcoin": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/troll/search.dws?q=',t); break;
	case "PeepCoin": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/pcn/search.dws?q=',t); break;
	case "Equal": 			t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "ITT":				t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "RouletteToken": 	t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "Suretly": 		t = $('myInput').value; open('https://etherscan.io/search?q=',t); break;
	case "SuperCoin": 		t = $('myInput').value; 
							open('https://chainz.cryptoid.info/super/search.dws?q=',t); break;
	case "Bata": 			t = $('myInput').value; 
							open('https://chainz.cryptoid.info/bta/search.dws?q=',t); break;
	case "Happycoin": 		t = $('myInput').value; 
							open('https://cryptobe.com/chain/HappyCoin/search?q=',t); break;
							
	case "Wanchain": 		//see
							alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; open('https://explorer.wanchain.org/?search=',t); break;						
	default: 				alert(whichBlockchain+string1+whichBlockchain+string2);
							t = $('myInput').value; 
							open('https://www.google.com/search?q='+whichBlockchain+' Blockchain Explorer',t); break;
}

}

}
