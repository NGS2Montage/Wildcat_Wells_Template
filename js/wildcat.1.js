/* **********************************
 * Version of Wildcat Wells for single player exeriment run by Brennan fall 2015
 * Uses three canonical maps and shows post-experiment survey asking players to guess which map they played.
 * **********************************/
var INSTRUCTION_ROUND = 10;
var WAITING_ROUND = 20; // after instructionis, wait here until everyone submits "Instructions Complete"
var FIRST_ACTUAL_ROUND = 101;

var max_score = 1000;
var scale = -1;
var scaleFactor = 1.0; // divide the scale by this
var num_rounds = 15;
var total_players = 16; // TODO: get from variable
var network = [];
// we don't want player 1 to always be network[1] because when there are mostly bots, the player will always be in the same spot.  So, we use a radix to shift the location
var playerRadix = 0; // converts between playerId and networkId.
var myNetworkId = 1;
var myNetwork = []; // in playerId, not networkId
var network_types = ["a","b","c","d","e","f","g","h"]; // load from variable
var network_type = "a"; // load from above
var min_distance2 = 0; //25; // square of: can't put in a new well closer than this
var showTeamModulo = -1;
var map_num = 1;
var num_maps = 50;
var showScoreWhenNotMap = false;

// added by CR
var genderTreatment = 0;
var names = [["Brad", "Jay", "Matthew"], ["Aisha", "Keisha", "Tamika"], ["Player 1", "Player 2", "Player 3"]];
var playerName = "You";
var sumGames = 0;
var endGameSurveyQ1 = "NA";
// var endGameSurveyQ2 = "NA";
var endGameSurveyQ3 = "NA";


// added by DB
var OPPOSITE_BOT_NOISE = 250;	// remember this is cut into half; i.e., 50 becomes [-25, +25]
var map_icons = {};

// added by BK
var customMap = -1;

var click_color = "#000000";
var instruction_timeout = 9999;
var round_seconds = 30;
var total_score = 0;
var instructionPanel = 1;
var panelCtr = 0;
var userClick = null;

var botBehavior = {}; // playerId => roundNum => function
var showScore = true; // changed to true/false
var showMap = true; // changed to true/false

/**********************************
 * initializeGame()
 * this gets called from the global initilize() from wildcat.html
 * it is now called as a callback only after all user awards have been read
 ********************************** */
function initializeGame() {
  log("AWARDS: " + JSON.stringify(awardsList));
  
  try {
    instruction_timeout = parseInt(variables['instruction_timeout']);
  } catch (err) {
  }

  try {
    total_players = parseInt(variables['total_players']);
  } catch (err) {
    alert(err);
  }

  try {
    customMap = parseInt(variables['customMap']);
  } catch (err) {
    alert(err);
  }

  try {
    round_seconds = parseInt(variables['round_seconds']);
    if (isNaN(round_seconds)) {
      round_seconds = 30;
    }
  } catch (err) {
    alert(err);
  }
  $(".i_seconds").html(round_seconds);

  // update the in-game clock too
  var seconds = round_seconds;
  var mins = Math.floor(seconds/60);
  var secondRemainder = seconds%60;
  var secondsStr = ('0'+secondRemainder).slice(-2); // add leading zero, then use last 2 digits
  $("#timer .countdown-clock").html(mins+':'+secondsStr);

  try {
    num_rounds = parseInt(variables['num_rounds']);
  } catch (err) {
    alert(err);
  }

  // CR: Read gender treatment variable
  try {
    genderTreatment = parseInt(variables['genderTreatment']);
  } catch (err) {
    alert(err);
  }

  $(".i_rounds").html(num_rounds);


  // at least as many players as the game launched with
  if (total_players < numPlayers) {
    total_players = numPlayers;
  }

  // CR: Adjust waiting message based on number of players
  if(total_players==1) {
  	$("#waitForOthers").html("Waiting...");
  } else {
  	$("#waitForOthers").html("Waiting for the other players...");
  }
  
  try {
    network_types = variables['network_types'].split(",");
  } catch (err) {
    alert(err);
  }

  try {
    num_maps = parseInt(variables['num_maps']);
  } catch (err) {
    alert(err);
  }

  Math.seedrandom(seed);
  try {
    showTeamModulo = parseInt(variables['showTeamModulo']);
  } catch (err) {
    alert(err);
  }
  if (showTeamModulo < 0) {
    var info = Math.floor(Math.random()*3);
    switch (info) {
      case 0:
        showTeamModulo = 0;
        break;
      case 1:
  //    case 2:
        showTeamModulo = 1;
        break;
      default:
        showTeamModulo = 3;
        break;
    }
  }

  try {
    showScore = parseInt(variables['showScore']);
    if (isNaN(showScore)) {
      throw "showScore not valid" // throw error
    }
    if (showScore < 0) {
      showScore = Math.floor(Math.random*2); // 0 or 1
    }
    switch(showScore) {
    case 0:
      showScore = false;
      break;
    default:
      showScore = true;
      break;
    }
  } catch (err) {
//    alert(err);
    try {
      showScore = variables['showScore'].toLowerCase() == 'true';
    } catch (err2) {
      showScore = true;
//      alert(err2);
    }
  }

  try {
    showMap = parseInt(variables['showMap']);
    if (isNaN(showMap)) {
      throw "showMap not valid" // throw error
    }
    if (showMap < 0) {
      showMap = Math.floor(Math.random*2); // 0 or 1
    }
    switch(showMap) {
    case 0:
      showMap = false;
      break;
    default:
      showMap = true;
      break;
    }
  } catch (err) {
//    alert(err);
    try {
      showMap = variables['showMap'].toLowerCase() == 'true';
    } catch (err2) {
      showMap = true;
//      alert(err2);
    }
  }
  try {
    var randScale = parseFloat(variables['randScale']); // .7 means .7 to 1
    var randRange = 1.0-randScale;
    scaleFactor = randScale + Math.random() * randRange;
    scale = 1000 * scaleFactor;
    log("scale:" + scale+" scaleFactor:"+scaleFactor);
  } catch (err) {
  }



  initializeNetwork();
  initializeBots();
  initializeHistory();
  initializeGameBoard();
  setInterval(advanceCountdowns, 100);

  if (!showScore) {
    setNeighborBarVisibility(false);
  }

  initializeInstructions();
}

function submitSurvey() {
	var pgs_q1=$('#pgs_q1').val();	//document.getElementById("preGameSurvey").pgs_q1.value;
	var pgs_q2=$('#pgs_q2').val();	//document.getElementById("preGameSurvey").pgs_q2.value;
	var pgs_q3=$('#pgs_q3').val();	//document.getElementById("preGameSurvey").pgs_q3.value;
	var pgs_q4=$('#pgs_q4').val();	//document.getElementById("preGameSurvey").pgs_q4.value;
	var pgs_q5=$('input[name=pgs_q5]:checked').val();
	var pgs_q6=$('input[name=pgs_q6]:checked').val();
  

	// Sanity check: did we get all the values we need?
	var complete = 1;
	if(pgs_q1=="NA") {
	    $('#qq1').css("color", "#ff0000");
	    complete = 0;
	} else {
	    $('#qq1').css("color", "#000000");
	}
	
	if(pgs_q2=="NA" | pgs_q3=="NA") {
	    $('#qq2').css("color", "#ff0000");
	    complete = 0;
	} else {
	    $('#qq2').css("color", "#000000");
	}
	
	if(pgs_q4=="NA") {
	    $('#qq4').css("color", "#ff0000");
	    complete = 0;
	} else {
	    $('#qq4').css("color", "#000000");
	}
	
	if(pgs_q5==undefined) {
	    $('#qq5').css("color", "#ff0000");
	    complete = 0;
	} else {
	    $('#qq5').css("color", "#000000");
	}
	
	if(pgs_q6==undefined) {
	    $('#qq6').css("color", "#ff0000");
	    complete = 0;
	} else {
	    $('#qq6').css("color", "#000000");
	}

	// Check if all questions answered
	if(complete==0) {
		alert("Please answer all questions.");
		return false;
	}
		
	//alert("<survey><answer type=\"pgs_q1\">"+pgs_q1+"</answer><answer type=\"pgs_q2\">"+pgs_q2+"</answer><answer type=\"pgs_q3\">"+pgs_q3+"</answer><answer type=\"pgs_q4\">"+pgs_q4+"</answer><answer type=\"pgs_q5\">"+pgs_q5+"</answer><answer type=\"pgs_q6\">"+pgs_q6+"</answer></survey>");
	submit("<survey><answer type=\"pgs_q1\">"+pgs_q1+"</answer><answer type=\"pgs_q2\">"+pgs_q2+"</answer><answer type=\"pgs_q3\">"+pgs_q3+"</answer><answer type=\"pgs_q4\">"+pgs_q4+"</answer><answer type=\"pgs_q5\">"+pgs_q5+"</answer><answer type=\"pgs_q6\">"+pgs_q6+"</answer></survey>");
	return true;
}

function initializeInstructions() {
  //In a multi-game sequence, we show the instructions only before the first game.
  if(sumGames>0) {
    instructionsComplete();
    return;
  }
  
  setRound(INSTRUCTION_ROUND);

  $('#instructions').modal({'show':true,'backdrop':"static"}).on('hidden.bs.modal', function (e) {
    instructionsComplete();
  });

  if (numPlayers > 1) {
    // don't start timer if single player
    setCountdown("instruction_time_limit",instruction_timeout);
  }

  $('#previous').hide();
  $('#previous').click(instructionPrevious);
  $('#next').click(instructionNext);
}

// Show instructions, but display previous page
function instructionPrevious() {
  instructionPanel--;

  switch(instructionPanel) {
  case 1:
    $('#instructions2').fadeOut(400, function() {
      $('#instructions1').fadeIn(400);
      $('#previous').hide();
    });
    break;
  case 2:
    $('#instructions3').fadeOut(400, function() {
      $('#instructions2').fadeIn(400);
    });
    break;
  case 3:
    $('#instructions6').fadeOut(400, function() {
      $('#instructions3').fadeIn(400);
    });
    break;
  }
}

// Show instructions of the current page
function instructionNext() {
  switch(instructionPanel) {
  case 1:
    $('#instructions1').fadeOut(400, function() {
      $('#instructions2').fadeIn(400);
      $('#previous').show();
    });
    break;
  case 2:
    $('#instructions2').fadeOut(400, function() {
      $('#instructions3').fadeIn(400);
    });
    break;
  case 3:
    $('#instructions3').fadeOut(400, function() {
      $('#instructions6').fadeIn(400);
    });
    break;
  case 4:
    var ret = submitSurvey();
    if(ret) {
    	$('#instructions').modal('hide');
    } else {
  		instructionPanel--;
	}
    break;
  }
  instructionPanel++;
}

/**
 * called when instructions are closed (forcably or not)
 */
function instructionsComplete() {
  if (currentRound < WAITING_ROUND) {
    setRound(WAITING_ROUND);
    submitRemainingBots();
  }
  stopCountdown("instruction_time_limit");
  submit("Instructions Complete");
  if (currentRound == WAITING_ROUND) {  // this check is only needed for reconnect
    waitForOtherPlayers();
  }
}

function initializeGameBoard() {
//  alert(getFile("ground.jpg"));

  initializeMap(MAP_W, MAP_H, 0);
  
  // changed by BK
  // instead of building maps by function we load fixed maps from stored file
  //buildMap((seed % num_maps)+1);
  if(customMap==1) {
    map = map1;
  } else if(customMap==2) {
    map = map2;
  } else if(customMap==3) {
    map = map3;
  }
  log("BK: Playing random map " + customMap + " [1,1]=" + map[0][0]);
  
  
  $("#myCanvas").css("background-image","url('"+getFile("ground.jpg")+"')");
  paper = Raphael("canvas", MAP_W*P, MAP_H*P);
//  paper.circle(256,256,256);

  $('#canvas').bind('click', mapClick);
  $('#drill').bind('click', drill);
  $('#x_coord').bind("keyup change",updateUserClick);
  $('#y_coord').bind("keyup change",updateUserClick);
}

/**
 * this is the network graph... who's wells you can see
 */
function initializeNetwork() {
  Math.seedrandom(seed);
  playerRadix = Math.floor(Math.random()*total_players);
  myNetworkId = getNetworkId(myid);
  network_type = network_types[Math.floor(Math.random()*network_types.length)];
  $(".gameid").append(network_type+" "+showTeamModulo);

//  var s = "playerRadix:"+playerRadix+"\n";
//  for (var i = 1; i < total_players; i++) {
//    var nid = getNetworkId(i);
//    s+= i + " => "+ nid + " => " + getPlayerId(nid) + "\n";
//  }
//  alert(s);

  switch(total_players) {
  case 1:
  case 2:
  case 3:
  case 4:
    // fully connected
    for (var i = 1; i <= total_players; i++) {
      network[i] = [];
      for (var j = 1; j <= total_players; j++) {
        if (i != j) {
          network[i].push(j);
        }
      }
    }
    break;
  case 5:
    switch(network_type.toLowerCase()){
    case 'line':
      network[1] = [2];
      network[2] = [1,3];
      network[3] = [2,4];
      network[4] = [3,5];
      network[5] = [4];
      // network[1] = [2,3,4,5];
      // network[2] = [1,3,4,5];
      // network[3] = [1,2,4,5];
      // network[4] = [1,2,3,5];
      // network[5] = [1,2,3,4];
      break;
    case 'clique':
      network[1] = [2,3,4,5];
	  network[2] = [1,3,4,5];
	  network[3] = [1,2,4,5];
	  network[4] = [1,2,3,5];
	  network[5] = [1,2,3,4];
     // network[1] = [2,3,4,5];
     //  network[2] = [1,3,4,5];
     //  network[3] = [1,2,4,5];
     //  network[4] = [1,2,3,5];
     //  network[5] = [1,2,3,4];
	  break;
    case 'triangles':
      network[1] = [2,3];
	  network[2] = [1,3];
	  network[3] = [1,2,4,5];
	  network[4] = [3,5];
	  network[5] = [3,4];
    // network[1] = [2,3,4,5];
    //   network[2] = [1,3,4,5];
    //   network[3] = [1,2,4,5];
    //   network[4] = [1,2,3,5];
    //   network[5] = [1,2,3,4];
	  break;
    case 'star':
      network[1] = [5];
	  network[2] = [5];
	  network[3] = [5];
	  network[4] = [5];
	  network[5] = [1,2,3,4];
    // network[1] = [2,3,4,5];
    //   network[2] = [1,3,4,5];
    //   network[3] = [1,2,4,5];
    //   network[4] = [1,2,3,5];
    //   network[5] = [1,2,3,4];
	  break;
    }
    break;
  case 8:
    switch(network_type.toLowerCase()){
    case 'connectedcliques':
      network[1] = [2,3,4];
      network[2] = [1,3,4];
      network[3] = [1,2,4];
      network[4] = [1,2,3,5];
      network[5] = [4,6,7,8];
      network[6] = [5,7,8];
      network[7] = [5,6,8];
      network[8] = [5,6,7];
      break;
    case 'connectedstars':
      network[1] = [4];
      network[2] = [4];
      network[3] = [4];
      network[4] = [1,2,3,5];
      network[5] = [4,6,7,8];
      network[6] = [5];
      network[7] = [5];
      network[8] = [5];
      break;
    }
    break;
  case 16:
    switch(network_type.toLowerCase()) {
    case 'a':
      network[1] =  [ 2, 3, 4];
      network[2] =  [ 1, 3, 4];
      network[3] =  [ 1, 2, 5];
      network[4] =  [ 1, 2, 5];
      network[5] =  [ 3, 4, 6];
      network[6] =  [ 5, 7, 8];
      network[7] =  [ 6, 8, 9];
      network[8] =  [ 6, 7, 9];
      network[9] =  [ 7, 8,10];
      network[10] = [ 9,11,12];
      network[11] = [10,12,16];
      network[12] = [10,11,13];
      network[13] = [12,14,15];
      network[14] = [13,15,16];
      network[15] = [13,14,16];
      network[16] = [11,14,15];
      break;
    case 'b':
      network[1] =  [ 2, 3, 4];
      network[2] =  [ 1, 3, 4];
      network[3] =  [ 1, 2, 5];
      network[4] =  [ 1, 2, 5];
      network[5] =  [ 3, 4, 6];
      network[6] =  [ 5, 7, 8];
      network[7] =  [ 6, 8, 9];
      network[8] =  [ 6, 7,10];
      network[9] =  [ 7,10,11];
      network[10] = [ 8, 9,11];
      network[11] = [ 9,10,12];
      network[12] = [11,13,16];
      network[13] = [12,14,15];
      network[14] = [13,15,16];
      network[15] = [13,14,16];
      network[16] = [12,14,15];
      break;
    case 'c':
      network[1] =  [ 2, 3, 4];
      network[2] =  [ 1, 3, 4];
      network[3] =  [ 1, 2, 5];
      network[4] =  [ 1, 2, 5];
      network[5] =  [ 3, 4, 6];
      network[6] =  [ 5,11,16];
      network[7] =  [ 8, 9,10];
      network[8] =  [ 7, 9,10];
      network[9] =  [ 7, 8,11];
      network[10] = [ 7, 8,11];
      network[11] = [ 6, 9,10];
      network[12] = [13,14,15];
      network[13] = [12,14,15];
      network[14] = [12,13,16];
      network[15] = [12,13,16];
      network[16] = [ 6,14,15];
      break;
    case 'd':
      network[1] =  [ 2, 3,16];
      network[2] =  [ 1, 3, 4];
      network[3] =  [ 1, 2, 4];
      network[4] =  [ 2, 3, 5];
      network[5] =  [ 4, 6, 7];
      network[6] =  [ 5, 7, 8];
      network[7] =  [ 5, 6, 8];
      network[8] =  [ 6, 7, 9];
      network[9] =  [ 8,10,11];
      network[10] = [ 9,11,12];
      network[11] = [ 9,10,12];
      network[12] = [10,11,13];
      network[13] = [12,14,15];
      network[14] = [13,15,16];
      network[15] = [13,14,16];
      network[16] = [14,15, 1];
      break;
    case 'e':
      network[1] =  [ 2, 3, 6];
      network[2] =  [ 1, 5,10];
      network[3] =  [ 1, 4, 8];
      network[4] =  [ 3, 5, 7];
      network[5] =  [ 2, 4, 9];
      network[6] =  [ 1, 7,11];
      network[7] =  [ 4, 6,13];
      network[8] =  [ 3,12,16];
      network[9] =  [ 5,13,14];
      network[10] = [ 2,12,15];
      network[11] = [ 6,12,14];
      network[12] = [ 8,10,11];
      network[13] = [ 7, 9,15];
      network[14] = [ 9,11,16];
      network[15] = [10,13,16];
      network[16] = [ 8,14,15];
      break;
    case 'f':
      network[1] =  [ 2, 3, 7];
      network[2] =  [ 1, 5, 6];
      network[3] =  [ 1, 4, 8];
      network[4] =  [ 3, 7, 9];
      network[5] =  [ 2, 8,10];
      network[6] =  [ 2, 9,10];
      network[7] =  [ 1, 4,11];
      network[8] =  [ 3, 5,11];
      network[9] =  [ 4, 6,12];
      network[10] = [ 5, 6,14];
      network[11] = [ 7, 8,13];
      network[12] = [ 9,13,16];
      network[13] = [11,12,15];
      network[14] = [10,15,16];
      network[15] = [13,14,16];
      network[16] = [12,14,15];
      break;
    case 'g':
      network[1] =  [ 2, 3, 5];
      network[2] =  [ 1, 4, 8];
      network[3] =  [ 1, 6, 9];
      network[4] =  [ 2, 5,11];
      network[5] =  [ 1, 4,12];
      network[6] =  [ 3, 7,10];
      network[7] =  [ 6, 8, 9];
      network[8] =  [ 2, 7,15];
      network[9] =  [ 3, 7,13];
      network[10] = [ 6,11,14];
      network[11] = [ 4,10,13];
      network[12] = [ 5,14,15];
      network[13] = [ 9,11,16];
      network[14] = [10,12,16];
      network[15] = [ 8,12,16];
      network[16] = [13,14,15];
      break;
    case 'h':
      network[1] =  [ 2, 3, 5];
      network[2] =  [ 1, 3, 4];
      network[3] =  [ 1, 2, 4];
      network[4] =  [ 2, 3, 7];
      network[5] =  [ 1, 6, 8];
      network[6] =  [ 5, 9,11];
      network[7] =  [ 4, 9,10];
      network[8] =  [ 5,10,12];
      network[9] =  [ 6, 7,12];
      network[10] = [ 7, 8,11];
      network[11] = [ 6,10,15];
      network[12] = [ 8, 9,13];
      network[13] = [12,14,16];
      network[14] = [13,15,16];
      network[15] = [11,14,16];
      network[16] = [13,14,15];
      break;
    }
    break;
  default:
    alert("error: invalid number of players")
  }
}

function getNetworkId(playerId) {
  return 1+( (playerId+playerRadix-1) % total_players);
}

function getPlayerId(networkId) {
  return 1+( (networkId-1-playerRadix+total_players) % total_players);
}

function initializeHistory() {
  addHistoryPanel(myNetworkId, "Player "+myNetworkId+" (<span id=\"ctr_playerName\">"+playerName+"</span>)");
  //for (var i = 0; i < Math.min(3,network[myNetworkId].length); i++) {
  for (var i = 0; i < network[myNetworkId].length; i++) {
    var myBuddy = getPlayerId(network[myNetworkId][i]);
    myNetwork.push(myBuddy);
    addHistoryPanel(network[myNetworkId][i], "Player "+network[myNetworkId][i]);
  }

  var initialization = {'networkType':network_type, 'myNetworkId':myNetworkId, 'myNeighbors':myNetwork, 'teamModulo':showTeamModulo, 'showScore':showScore, 'showMap':showMap, 'scaleFactor':scaleFactor};

  for (var i in botBehavior) {
    initialization['bot'+i] = botBehavior[i]['name'];
  }

  submit(JSON.stringify(initialization));
//  initializeGameRound(1);  // if starts under instructions
}

function addHistoryPanel(networkId, name) {
  // it's networkId, not playerId

  // first 3 have the bottom dashed
  panelCtr++;
  var extraClass = " bottom_dashed";
  if (panelCtr == 5) {
    extraClass = "";
  }

  var head = ""
  if(networkId!=myNetworkId) {
    //'<img src="/attachment/treatment'+genderTreatment+'.png"/>'
    //head = '; playerID:'+networkId+'; treatment: '+genderTreatment+'<h3>'+names[genderTreatment-1][networkId-1]+'</h3>'
    head = ' <h3>'+names[genderTreatment-1][networkId-1]+'</h3>'
  }
  var s = '<div class="history_panel'+extraClass+'">'+
      '<div class="history_title">'+name+head+'</div>'+
            '<div id="history_'+networkId+'" class="history_middle">'+
            '<div class="left_text rotate">Score</div>'+
            '<table class="history_table">';
  for (var i = 1; i <= num_rounds; i++) {
//          s+='<col width="25px"/>';
  }
            s+='<tr>';
  for (var i = 1; i <= num_rounds; i++) {
      s+='<td class="history_bar" height="85%" width="1"><div id="bar_'+networkId+'_'+i+'" class="pre_round">?</div></td>';
  }
          s+= '</tr><tr>';
  for (var i = 1; i <= num_rounds; i++) {
            s+='<td class=""  height="15%" width="1">'+i+'</td>';
  }
		// CR chainging
//  		s+= '</tr></table>'+
//            '<div class="history_foot">Round</div></div>'+
//            '<div class="history_bg history_hide" id="history_bg_'+networkId+'">?</div>'+
//          '</div>';
        s+= '</tr></table>'+
            '<div class="history_foot">Round</div></div>'+
          '</div>';
  //alert(s);
  $("#history_wrapper").append(s);
}

function getScore(x,y) {
  log("x:"+x + " y:"+y+" rawScore:"+map[x][y]+ " scale:" + scale + " scaledScore:"+Math.min(max_score,Math.max(0,Math.floor(scale*map[x][y]))) );
  return Math.min(max_score,Math.max(0,Math.floor(scale*map[x][y])));
}

function updateUserClick() {
  if (submitted) return;
  fail = false;
  var x = $("#x_coord").val();
  if (x.length > 0) {
    x = parseInt(x);
    if (isNaN(x) || x < 0 || x > MAP_W) {
      $("#x_coord").val("");
      fail = true;
    }
  }
  var y = $("#y_coord").val();
  if (y.length > 0) {
    y = parseInt(y);
    if (isNaN(y) || y < 0 || y > MAP_H) {
      $("#y_coord").val("");
      fail = true;
    }
  }

  if (fail) {
    if (userClick != null) {
      userClick.remove();
      userClick = null;
    }
  }

  if (userClick == null) {
    // added by DB
    // cross instead of rectangle
    userClick = drawMapIcon('cross', x, y);
    //userClick = paper.rect(x-1,y-1,3,3);
    userClick.attr({fill: click_color, stroke: click_color});
  } else {
    userClick.transform('t' + (x-2) + ',' + (y-2));
    //userClick.attr({x: x-1, y: y-1});
  }
}

var round = 1;
function mapClick(evt) {
  if (submitted) return;

  var offset = $(this).offset();
  var x = Math.floor(evt.pageX-offset.left);
  var y = Math.floor(evt.pageY-offset.top);
  $("#x_coord").val(x);
  $("#y_coord").val(y);
  updateUserClick();
}

function drill() {
  if (currentRound < FIRST_ACTUAL_ROUND) return; // waiting for instructions

  var x = $("#x_coord").val();
  var y = $("#y_coord").val();
  if (x.length == 0 || y.length == 0) {
    alert("Please click a new well site on the map.");
    return;
  }
  x = parseInt(x);
  y = parseInt(y);
  makeChoice(x,y);
}

// added by DB:
function drawMapIcon(icon_type, x, y){
  var icon;
  switch(icon_type){
    case 'cross':
      icon = paper.set();
      icon.push(
        paper.rect(2,0,1,5),
        paper.rect(0,2,5,1)
      );
      icon.transform('t' + (x-2) + ',' + (y-2));
      break;
    case 'circle':
      icon = paper.circle(x, y, 2.5);
 	  icon.attr({r: 12}).animate({r: 2.5}, 500, "bounce");
      break;
    case 'square':
      icon = paper.rect(x-2,y-2,5,5);
	  icon.attr({x:x-7, y:y-7, width: 13, height: 13}).animate({x:x-2, y:y-2, width: 5, height: 5}, 500, "bounce");
      break;
  }
  return icon;
}

function setBar(networkId,round,value, x, y) {
  var bar = $("#bar_"+networkId+"_"+round)

  bar.removeClass('pre_round');
  if (value < 0) {
    bar.addClass('skip_round');
    bar.html("X");
    return;
  }

  var fraction = Math.min(1.0,Math.max(0,value/max_score)); // 0-1
  var height = Math.floor(100*fraction);
  $("#mapValue").html(height);

  var midpoint = 0.4; // where yellow is; lower for more red on the chart, higher for more blue on the chart
  var r = 255;
  var g = 0;
  var b = 0;
  if (fraction < midpoint) {
    // blue => yellow
    r = g = Math.floor(255.0 * fraction/midpoint);
    b = 255-r;
  } else {
    // yellow => red
    r = 255;
    g = 255 - Math.floor(255* (fraction-midpoint)/(1.0-midpoint) );
    //b = 0; // from above
  }
  var color = "rgb("+r+","+g+","+b+")";
  bar.html("");
  bar.css("background-color",color);
  bar.css("height",height+"%");
  bar.attr("title",value);
  if (showMap || networkId == myNetworkId) {
    bar.click(function() {
      $("#x_coord").val(x);
      $("#y_coord").val(y);
      updateUserClick();
    });
  }



  if (x >= 0) {
    // added by DB:
    var point = drawMapIcon(map_icons[networkId], x, y);
    //var point = paper.rect(x-1,y-1,3,3);
    point.realColor = color;
    point.realValue = value;
    if (networkId != myNetworkId) {
      neighborPoints.push(point);
      if (!showScore) {
        color = click_color;
        value = "?";
        point.toBack(); // so black ones don't cover colored ones especially if copy
      }
    }
    point.attr({fill: color, stroke: color, title: value});
  }
}

var neighborPoints = [];

var gameRound = 0;
var submissions = {}; // round => networkId => [x,y,val]; keep track of who submitted for bot behavior
function initializeGameRound(newGameRound) {
  submitted = false;
  if (userClick != null) {
    userClick.remove();
    userClick = null;
  }
  gameRound = newGameRound;
  setRound(gameRound+FIRST_ACTUAL_ROUND-1);
  submissions[currentRound] = {};
  $("#x_coord").val("");
  $("#y_coord").val("");

  var seconds = round_seconds;

  // no timer on round one if single player
  setCountdown("timer",seconds);

  $("#round").html(gameRound);
  $("#score").html(numberWithCommas(total_score));
  doneWaitingForOtherPlayers();

}

/**
 * the points on the map
 * @param enable
 */
function setNeighborPointVisibility(enable) {
  for (var p in neighborPoints) {
    if (enable) {
      neighborPoints[p].show();
    } else {
      neighborPoints[p].hide();
    }
  }
}

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

//function countdownUpdate(id,diff,clockString) {
//  $("#instruction_time_limit").html(clockString);
//}

function countdownExpired(id) {
  // by CR
  if (id=="botTimer") {
    submitRemainingBots();
    return;
  } else if (id=="instruction_time_limit") {
    $('#instructions').modal('hide'); // calls instructionsComplete()
    return;
  }

  var x = $("#x_coord").val();
  var y = $("#y_coord").val();

  if (x.length == 0 || y.length == 0 || !checkDistance(myid,x,y)) {
    x = -1;
    y = -1;
    // TODO: notify user
  }
  x = parseInt(x);
  y = parseInt(y);
  submitMyChoice(x,y);
  submitRemainingBots();
}

function completeRound() {
  // draw the bar/points
  stopCountdown("timer");

  // mine
  var neighbor = myNetworkId;
  var val = submissions[currentRound][neighbor];
  if (val[2] > 0) {
    total_score+=val[2];
  }
  setBar(neighbor,gameRound,val[2],val[0],val[1]);

//  log("rendering neighbors gameRound:"+gameRound+" currentRound:"+currentRound);
  // fill in your neighbor's information
  for (var i = 0; i < network[myNetworkId].length; i++) {
    neighbor = network[myNetworkId][i];
    val = submissions[currentRound][neighbor];
    setBar(neighbor,gameRound,val[2],val[0],val[1]);
  }
  if ((showTeamModulo > 0) && ((gameRound) % showTeamModulo == 0)) {
//    for (var roundDif = -(showTeamModulo-1); roundDif <= 0; roundDif++) { // how many rounds back to render
////    log("rendering round:"+(gameRound+roundDif));
//      for (var i = 0; i < network[myNetworkId].length; i++) {
//        neighbor = network[myNetworkId][i];
//        val = submissions[currentRound+roundDif][neighbor];
//        setBar(neighbor,gameRound+roundDif,val[2],val[0],val[1]);
//      }
//    }
    if (showScore) {
      setNeighborBarVisibility(true);
      // setNeighborBarVisibility(false);
    }
    if (showMap) {
      setNeighborPointVisibility(true);
      // setNeighborPointVisibility(false);
    }
  } else {
    // draw the bar, but not the point
    if (showScoreWhenNotMap) {
//      log("rendering neighbors barOnly gameRound:"+gameRound+" currentRound:"+currentRound);
//      for (var i = 0; i < network[myNetworkId].length; i++) {
//        neighbor = network[myNetworkId][i];
//        val = submissions[currentRound][neighbor];
//        setBar(neighbor,gameRound,val[2],-1,-1);
//        if (showScore) {
//          setBarVisibility(neighbor,true);
//        }
//        if (showMap) {
//          setNeighborPointVisibility(true);
//        }
//      }
      if (showScore) {
        setNeighborBarVisibility(true);
        // setNeighborBarVisibility(false);
      }
      if (showMap) {
        setNeighborPointVisibility(true);
        // setNeighborPointVisibility(false);
      }
    } else {
      setNeighborBarVisibility(false);
      setNeighborPointVisibility(false);
    }
  }

  if (!showMap) {
    setNeighborPointVisibility(false);
  }

  if (!showScore) {
    setNeighborBarVisibility(false);
  }

  if (gameRound < num_rounds) {
    initializeGameRound(gameRound+1);
  } else {
    showSurvey();
  }
}

/** ************************************
 * showSurvey()
 * this gets called after the player played the last round
 * if this is the last game in a sequence of games, show the survey
 * if it is not the last game, just call endGame() which will handle the further sequencing
 *  ************************************ */
function showSurvey() {
  stopCountdown("botTimer");

  //CR: Sequencer code
  /*
  if(sumGames<3) { 	//sumGames gets incremented in endGame() so if the target is 4 games, then this needs to be 4-1
    endGame();
  } else {
    setRound(300);
    $('#endGameSurveyModal').modal({'show':true,'backdrop':"static"});
    $('#endGameSubmit').hide();
  }*/
  
    //BK: Show end game survey
    setRound(300);
  	$('#endGameSubmit').click(endGameSubmitPage1);	//if you add the click function in HTML it cannot be overwritten so we need to do it here
    $('#endGameSurveyModal').modal({'show':true,'backdrop':"static"});
}

// Submit function called after first page of end-game survey (the gender question)
function endGameSubmitPage1() {
  	// Read data and store it; let the user move on if everything is complete; value gets submitted in the next step
	endGameSurveyQ1=$('#endGame_q1').val();
    // endGameSurveyQ2=$('#endGame_freeText').val();
    endGameSurveyQ3=$('#endGame_q3').val();
    // endGameSurveyQ2 = endGameSurveyQ2.replace(/[^\w\s]/gi, '');
  	if(endGameSurveyQ1=="NA" || endGameSurveyQ3=="NA") {
    	alert("Please answer the question before moving on.");
    } else {
	    $('#endGamePage1').fadeOut(400, function() {
          $('#resetAll').css('visibility', 'visible');
    	  $('#endGameSubmit').html('Submit');
          $('#endGameSubmit').off('click').on('click', endGameSubmitPage2);
		  shuffle("imgQuestionContainer");           //Randomize sequence of image question
    	  $('#endGamePage2').fadeIn(400);
	    });
    }
}

// Submit function called after first page of end-game survey (the gender question)
function endGameSubmitPage2() {
  	// Read data and store it; let the user move on if everything is complete
	var rankMap1=$('#endGame_rankMap1').val();
	var rankMap2=$('#endGame_rankMap2').val();
	var rankMap3=$('#endGame_rankMap3').val();

  	// check if all questions are answered
  	if(rankMap1=="NA" || rankMap2=="NA" || rankMap3=="NA") {
    	alert("Please answer the question before moving on.");
  	} else {
  		// submit survey 
		// alert ("<endGameSurvey><answer type=\"ModelQuestion\">"+endGameSurveyQ1+"</answer><answer type=\"FreeText\">"+endGameSurveyQ2+"</answer><answer type=\"RankMap1\">"+rankMap1+"</answer><answer type=\"RankMap2\">"+rankMap2+"</answer><answer type=\"RankMap3\">"+rankMap3+"</answer></endGameSurvey>");
		submit("<endGameSurvey><answer type=\"ModelQuestion\">"+endGameSurveyQ1+"</answer><answer type=\"RiskQuestion\">"+endGameSurveyQ3+"</answer><answer type=\"RankMap1\">"+rankMap1+"</answer><answer type=\"RankMap2\">"+rankMap2+"</answer><answer type=\"RankMap3\">"+rankMap3+"</answer></endGameSurvey>");
  
		// end the game: hide the endGameSurvey and call endGame()
		$('#endGameSurveyModal').modal('hide');
		endGame();
    }
}


function setNeighborBarVisibility(enable) {
  for (var i = 0; i < network[myNetworkId].length; i++) {
    var neighbor = network[myNetworkId][i];
    setBarVisibility(neighbor,enable);
  }
}

function setBarVisibility(neighbor, enable) {
  if (enable) {
    $("#history_"+neighbor).removeClass("history_hide");
    $("#history_bg_"+neighbor).addClass("history_hide");
  } else {
    $("#history_"+neighbor).addClass("history_hide");
    $("#history_bg_"+neighbor).removeClass("history_hide");
  }
}

/**
 * render the map under the points
 */
function revealMap() {
  drawBitMap();
//  $("#myCanvas").css("background-image","");
}


function amtScoreFilter() {
  // DEPCIRATED NO USING THIS ANYMORE
  // This function checks the final results for the player to ensure they participated in at
  // least 70% of the rounds.  Edit this code to change the payment criteria for Turkers and
  // to add any bonuses.
  var valids=0;

  // iterate through players and rounds

  for (var round = FIRST_ACTUAL_ROUND; round < FIRST_ACTUAL_ROUND+num_rounds; round++) {
    var val = submissions[round][myNetworkId][2]; // the score part of the array
    if (val > 0) { //if round score was not 0 and is the current player
      valids++;
    }
  }
  var pay = false;
  if (valids>=num_rounds*.699){ //if participated in at least 69.9% of rounds
    payAMT(true,0.0);
  }else{
    payAMT(false,0.0);
  }
}

/** ************************************
 * CODE THAT CURRENTLY ENDS WILDCAT WELLS
 * 
 * If there is a final survey that needs to be shown before the last game in a sequence, then this is already
 * taken care of by showSurvey()
 * this is the real end where we either send the user on to the next game in a sequence or tell him he is done.
 ****************************************/
function endGame() {
  //properly color them all in the map
  for (p in neighborPoints) {
    var point = neighborPoints[p];
    point.attr({fill: point.realColor, stroke: point.realColor, title: point.realValue});
  }
  //setNeighborBarVisibility(true);
  //setNeighborPointVisibility(true);
  //revealMap();

  //CR: Don't reveal map and scores at the end of the game
  setNeighborBarVisibility(false);
  setNeighborPointVisibility(false);
  //revealMap();

  doneWaitingForOtherPlayers();
  
  //CR: Write hidden awards to track which treatment user has already played and total oil they found
  /*
  sumGames++;
  totalOil = totalOil + total_score;
  writeUserHT("gender_" + genderTreatment, 1, null);
  writeUserHT("totalOil", totalOil, null);
  if(sumGames==4) {
    // The player has completed all four games; clear awards
    writeUserHT("gender_1", 0, null);
    writeUserHT("gender_2", 0, null);
    writeUserHT("gender_3", 0, null);
    writeUserHT("gender_4", 0, null);
    writeUserHT("totalOil", 0, null);
    writeUserHT("playerName", 0, null);
  }
  */

  // CR: Store final result for payout purposes
  var payBonus = (total_score / 1000) * 0.08; 	// simply multiply totalOil wiht conversion rate for 1k barrels of oil
  submit('<payout totalOil="' + total_score + '" AMTBonusPay="' + payBonus + '" />');

  //End the game by calling experimentComplete() or payAMT() depending on who is playing
  if (IS_AMT==true){
    //We are not using the filter anymore. // amtScoreFilter();
    log("AMT Game; payAMT(true," + payBonus + ")");
    payAMT(true, payBonus);
  } else {
    experimentComplete();
  }

  //CR: Nicer looking final score screen with button to end the game shown after 4 games
  $("#scoreTable").append('<tr><td>Congratulations!<br/></td></tr>');
  $("#scoreTable").append('<tr><td>You collected '+numberWithCommas(total_score)+' barrels of oil in this game.</td></tr>');
  $("#nextGame").prop('value', 'Exit');
  $("#nextGame").removeAttr('disabled');
  $("#nextGame").click(function() {
		window.location="http://volunteerscience.com/experiments/brennan/";
  });
  $("#scores").fadeIn();
}

// player's choice, return false if too close
function makeChoice(x,y) {
  if (!checkDistance(myid,x,y)) {
    alert("Too close to an existing well!");
    return;
  }
  submitMyChoice(x,y);
  
  // by CR
  // The human player is done let's submit remaining bots, but only after we wait for a timeout:
  // we call submitRemainingBotsWithRandomWait() which (a) reads the remaining time; (b) sets a random timer between 0 and remaining; (c) then returns
  // the timer is updated every 100ms (this is  already in place for all the other times (round timer and instructions timer)
  // once the timer is up, this is caught by countdownExpried() which now calls submitRemainingBots()
  submitRemainingBotsWithRandomWait();
}

function playerDisconnect(playerId) {
  log("Player Disconnect "+playerId);

  if (playerId < myid || currentRound == WAITING_ROUND) {
    submitRemainingBots();
  }
}

/**
 * return false if illegal for this player
 * note that we only check against the player's network
 */
function checkDistance(playerId, x, y) {
//  if (gameRound == 1) return true; // first round
  return true; // abandon this feature

  var networkId = getNetworkId(playerId);
  for (var round = FIRST_ACTUAL_ROUND; round < currentRound; round++) {
    var sub = submissions[round][networkId]; // self
    if (sub[2] >= 0) { // there's a valid submission
      var dx = x-sub[0];
      var dy = y-sub[1];
      var d2 = dx*dx + dy*dy;
      if (d2 < min_distance2) {
        return false;
      }
    }

    for (var i = 0; i < network[myNetworkId].length; i++) {
      sub = submissions[round][network[networkId][i]]; // neighbor
      if (sub[2] >= 0) { // there's a valid submission
        var dx = x-sub[0];
        var dy = y-sub[1];
        var d2 = dx*dx + dy*dy;
        if (d2 < min_distance2) {
          return false;
        }
      }
    }
  }
  return true;
}

var submitted = false;
function submitMyChoice(x,y) {
  if (submitted) return;
  waitForOtherPlayers();
  submitChoice(myid,x,y);
}

function waitForOtherPlayers() {
  submitted = true;
  $("#drill").prop("disabled", true);
  // CR: Adjust waiting message based on number of players
  if(total_players==1) {
  	$("#drill").val("Waiting...");
  } else {
  	$("#drill").val("Waiting for the other players...");
  }
  $("#waitForOthers").fadeIn();
}

function doneWaitingForOtherPlayers() {
  $("#drill").prop("disabled", false);
  $("#drill").val("Drill!");
  $("#waitForOthers").fadeOut();
}

function showScores() {
  var scores = [[0,0]]; // player 0

  for (var playerId = 1; playerId <= total_players; playerId++) {
	scores.push([0,getNetworkId(playerId)]); // initialize array
    for (var round = FIRST_ACTUAL_ROUND; round < FIRST_ACTUAL_ROUND+num_rounds; round++) {
      var val = submissions[round][getNetworkId(playerId)][2]; // the score part of the array
      if (val > 0) {
        scores[playerId][0]+=val;
      }
    }
  }

  scores.splice(0,1); // remove first element

  scores.sort(function(a,b) {
    return b[0] - a[0];
  });

  var lastRank = 1;
  var last = 0;
  for (var idx in scores) {
    var rank = parseInt(idx)+1;
    var playerNameString = "Player "+scores[idx][1];
    if (scores[idx][1] == myNetworkId) {
      playerNameString += " (playerName)";
    }
    var scoreString = numberWithCommas(scores[idx][0]);
    if (last==scores[idx][0]) {
      rank = lastRank;
    } else {
      last=scores[idx][0];
      lastRank = rank;
    }
    //CR: trying to not show score
    $("#scoreTable").append('<tr><th>#'+rank+'</th><td>'+playerNameString+'</td><td>'+scoreString+'</td></tr>');
  }

  $("#scores").fadeIn();
}

function hideScores() {
  $("#scores").fadeOut();
}


function submitChoice(playerId,x,y) {
  var score = -1;
  try {
    score = getScore(x,y);
  } catch (err) {
    x = -1;
    y = -1;
  }
  submitBot(playerId, currentRound, JSON.stringify([x,y,score]));
}

/**
 *
 *
 * @param jsonString [['explore', 3],[ 'exploit',5],[ 'random', 2],['explore',8]]
 * @returns // round => array of functions to call for the bot's behavior
 */
function initializeBotOrder(jsonString, name) {
  var ret = [];

  try {
    var orders = JSON.parse(jsonString);
    for (var c in orders) {
      for (var i = 0; i < orders[c][1]; i++) {
        if (orders[c][0] == "explore") {
          ret.push(botExplore);
        } else if (orders[c][0] == "random") {
          ret.push(botRandom);
        } else if (orders[c][0] == "exploit") {
          ret.push(botExploit);
        } else if (orders[c][0] == "copy") {
          ret.push(botCopy);
        } else if (orders[c][0] == "copyOpposite") {
          ret.push(botCopyOpposite);
        }
      }
    }

  } catch (err) {
    alert("Error parsing "+jsonString+"\n"+err);
  }

  // repeat the last move until the end -- this is in case the instructions are shorter than the number of rounds
  while (ret.length < num_rounds) {
    ret.push(ret[ret.length-1]);
  }

  ret["name"] = name;
  return ret;
}

var bot_peakLimit = 5;
var bot_random_rule = "50,25,25"; // explore, exploit, copy;  converted to array of numbers
var bot_random_rule_sum = 100;
var bot_exploit_near = 10;
var botExploitLocation = "random";
var bot_copy_rule = "random";

function initializeBots() {
  var clusterBehavior = initializeBotOrder(variables['cluster'],'cluster');
  var humanBehavior = initializeBotOrder(variables['human'],'human');
  var num_clusters_remaining = parseInt(variables['num_cluster_bots']);
  try {
    bot_peakLimit = parseInt(variables['peakLimit']) * scaleFactor;
  } catch (err) { alert(err); }

  try {
    bot_random_rule = variables['random_rule'];
  } catch (err) { alert(err); }
  bot_random_rule = bot_random_rule.split(",").map( function(val) { return parseInt(val); }); // string of numbers to array of numbers
  bot_random_rule_sum = bot_random_rule.reduce( function(total, num){ return total + num }, 0);

  try {
    bot_exploit_near = parseInt(variables['near']);
  } catch (err) { alert(err); }

  // assume random exploitation location
  var x = Math.floor(Math.random()*MAP_W);
  var y = Math.floor(Math.random()*MAP_H);
  botExploitLocation = [x,y];
  var foo = variables['exploit_location'].split(",");
  if (foo.length == 2) {
    botExploitLocation = foo.map( function(val) { return parseInt(val); });
  }

  try {
    bot_copy_rule = variables['copy_rule'];
  } catch (err) { alert(err); }


  // modified by DB
  // different icons for different players
  var available_icons = ['circle', 'square'];

  for (var i = 1; i <= total_players; i++) {
    var playerId = i; //getPlayerId(i);
    botBehavior[playerId] = humanBehavior; // human dropouts, and default bots

    // cluster bots get different behavior
    if ( (i > numPlayers) && (num_clusters_remaining > 0) ) {
      log("player "+getNetworkId(playerId)+"("+playerId+") is a clusterBot");
      botBehavior[playerId] = clusterBehavior;
      num_clusters_remaining--;
    }

    // define map icon
    var networkId = getNetworkId(i);
    if(networkId == myNetworkId){
      map_icons[networkId] = 'cross';
    } else {
      // take a random icon for the bot:
      var icon_index = available_icons[Math.floor(Math.random() * available_icons.length)];
      map_icons[networkId] = available_icons.splice(icon_index, 1)[0];
    }
  }

  // end DB modification
}

// added by CR: instead of submitting the remaining bots immediately after the human player is done, let's wait a bit
function submitRemainingBotsWithRandomWait() {
  // read time delay from already-in-place game coundown
  // then compute a random delay anywhere between 0 and the remaining time
  var remaining = parseInt($('#timer').text().substring(2));
  var delay = Math.floor(Math.random()*remaining);
  log("## copyOpposite remaining:"+remaining+" delay:" + delay + "");
  setCountdown("botTimer", delay);
}

function submitRemainingBots() {
  // abort if I'm not the lowest active player
  for (var i = 1; i < myid; i++) {
    if (activePlayers[i]) return;
  }
  log('submitRemainingBots');

  if (currentRound == WAITING_ROUND) {
    for (var i = 1; i <= numPlayers; i++) {
      if (!activePlayers[i]) {
        log('submit Player Dropped '+i);
        submitBot(i, currentRound, "Player Dropped");
      }
    }
    return;
  }

  // submit anyone who needs it
  for (var i = 1; i <= total_players; i++) {
//    log(i+" in "+JSON.stringify(submissions[currentRound]));
    if (!(String.valueOf(i) in submissions[currentRound])) {
      if (i > numPlayers || !activePlayers[i]) { // bot from beginning || dropped player
        doBotBehavior(i);
      }
    }
  }
}

function doBotBehavior(playerId) {
  log('doBotBehavior:'+playerId);

  var bestSub = null; // x,y,val

  var myNet = network[getNetworkId(playerId)].slice(0);
  myNet.push(getNetworkId(playerId));
  for (var round_idx = FIRST_ACTUAL_ROUND; round_idx < currentRound; round_idx++) {
    for (neighbor_idx in myNet) {
      var sub = submissions[round_idx][myNet[neighbor_idx]];
      if ((bestSub == null) || (sub[2] > bestSub[2])) {
        bestSub = sub;
      }
    }
  }

  // hard coded grab for good spot
  if (bestSub != null && bestSub[2] >= bot_peakLimit) {
    botCopy(playerId,bestSub);
    return;
  }

  botBehavior[playerId][currentRound-FIRST_ACTUAL_ROUND](playerId,bestSub);
}

function botExplore(playerId, bestSub) {
  log('botExplore:'+playerId);
  var x = Math.floor(Math.random()*MAP_W);
  var y = Math.floor(Math.random()*MAP_H);
  submitChoice(playerId,x,y);
}

function botCopy(playerId, bestSub) {
  log('botCopy:'+playerId);
  if (bestSub != null) {
    botCopyHelper(playerId, bestSub, bot_copy_rule);
  } else {
    botExplore(playerId, bestSub);
  }
}

var bot_copy_options = ["highest","any","users_last"];
function botCopyHelper(playerId, bestSub, copyType) {
  log('botCopyHelper:'+playerId+","+copyType);
  if (copyType == "random") {
    botCopyHelper(playerId, bestSub, bot_copy_options[Math.floor(Math.random()*bot_copy_options.length)]);
    return;
  }

  if (copyType == "highest") {
    submitChoice(playerId,bestSub[0],bestSub[1]);
    return;
  }

  if (copyType == "any") {
    var options = [];
    var myNet = network[getNetworkId(playerId)].slice(0);
    for (var round_idx = FIRST_ACTUAL_ROUND; round_idx < currentRound; round_idx++) {
      for (neighbor_idx in myNet) {
        var sub = submissions[round_idx][myNet[neighbor_idx]];
        if (sub[2] > 0) {
          options.push(sub);
        }
      }
    }

    if (options.length < 1) {
      botExplore(playerId,bestSub);
      return;
    }
    var bestSub = options[Math.floor(Math.random()*options.length)];
    submitChoice(playerId,bestSub[0],bestSub[1]);
    return;
  }

  if (copyType == "users_last") {
    var options = [];
    var myNet = network[getNetworkId(playerId)].slice(0);
    for (neighbor_idx in myNet) {
      var otherPid = getPlayerId(myNet[neighbor_idx]);
      if (otherPid < numPlayers) {
        var sub = submissions[currentRound][myNet[neighbor_idx]];
        options.push();
      }
    }
    if (options.length < 1) {
      botExplore(playerId,bestSub);
      return;
    }
    var bestSub = options[Math.floor(Math.random()*options.length)];
    submitChoice(playerId,bestSub[0],bestSub[1]);
    return;
  }

  // default behavior
  botExplore(playerId, bestSub);
}


function botExploit(playerId, bestSub) {
//  log('botExploit:'+playerId+" "+botExploitLocation);
//  if (bestSub != null) {
    var direction = Math.random()*Math.PI*2.0;
    var distance = Math.random()*bot_exploit_near;
    var x = Math.floor(botExploitLocation[0]+Math.cos(direction)*distance);
    var y = Math.floor(botExploitLocation[1]+Math.sin(direction)*distance);
    x = Math.min(MAP_W, Math.max(0,x)); // bounds check
    y = Math.min(MAP_H, Math.max(0,y)); // bounds check
    log('botExploit:'+playerId+" "+botExploitLocation+" direction:"+direction+" ("+x+","+y+")");
    submitChoice(playerId,x,y);
//  } else {
//    botExplore(playerId, bestSub);
//  }
}

function botRandom(playerId, bestSub) {
  log('botRandom:'+playerId);
  var roll = Math.floor(Math.random()*bot_random_rule_sum);
  var choice = 0;
  var choiceSum = 0;
  for (choice = 0; choice < bot_random_rule.length;  choice++) {
    choiceSum+=bot_random_rule[choice];
    if (roll < choiceSum) {
      break;
    }
  }

  switch(choice) {
  case 0:
    botExplore(playerId, bestSub);
    break;
  case 1:
    botExploit(playerId, bestSub);
    break;
  default:
    botCopy(playerId, bestSub);
    break;
  }
}

// added by DB & CR
// ----- {
function botCopyOpposite(playerId, bestSub){
  // get user's latest submission
  var x = $("#x_coord").val();
  var y = $("#y_coord").val();
  log("## copyOpposite lastHuman("+x+", "+y+")");
  
  // check if human performed valid move - else there is nothing to copy and bot plays random
  if(x=="" | y=="") {
  	x = Math.floor(Math.random()*MAP_W);
	y = Math.floor(Math.random()*MAP_H);
	log('## copyOpposite no valid human move playing random('+x+", "+y+")");
    submitChoice(playerId,x,y);
	return;
  }
  
  // turn it around
  var opposite_x = MAP_W - x;
  var opposite_y = MAP_H - y;

  // add some noise
  var noise_x = Math.floor( (Math.random() - .5) * OPPOSITE_BOT_NOISE);
  var noise_y = Math.floor( (Math.random() - .5) * OPPOSITE_BOT_NOISE);

  // check if out of bounds on x-axis
  if((opposite_x + noise_x) < 0) {
    // left border
    x = Math.abs(noise_x);
  } else if( (opposite_x + noise_x) > MAP_W) {
    // right border
    x = MAP_W - Math.abs(noise_x);
  } else {
    x = opposite_x + noise_x;
  }

  // check if out of bounds on x-axis
  if((opposite_y + noise_y) < 0) {
    // upper border
    y = Math.abs(noise_y);
  } else if( (opposite_y + noise_y) > MAP_H) {
    // bottom border
    y = MAP_H - Math.abs(noise_y);
  } else {
    y = opposite_y + noise_y;
  }

  log("## copyOpposite playing(" + x + "," + y + ")");

  submitChoice(playerId, x, y);
  return;
}
// } -----


function newMove(playerId, idx, round) {
  // wait for everyone to close the instructions
  if (round == WAITING_ROUND) {
    for (var i = 1; i <= numPlayers; i++) {
      if (moves[i] < 1) return;
    }
    initializeGameRound(1);
    return;
  }

  fetchMove(playerId, round, idx, function(val, participant, round, index) {
    submissions[round][getNetworkId(playerId)] = JSON.parse(val);

    for (var i = 1; i <= total_players; i++) {
      if (!(i in submissions[currentRound])) {
        return;
      }
    }
    completeRound();
  });
}

/* *************************************************
 * Linked drop-down boxes: Checks removes selected value from one box at other boxes
 * Also implements functionality for a reset button (reset=true)
 * By CR
 *************************************************** */
window.mySelect = function(x) {
    $('#endGame_rankMap1, #endGame_rankMap2, #endGame_rankMap3').not(x)
        .children('option[value=' + x.value + ']')
        .attr('disabled', true);
}

window.shuffle = function(x) {
    var parent = $("#"+x);
    var divs = parent.children();
    while (divs.length) {
        parent.append(divs.splice(Math.floor(Math.random() * divs.length), 1)[0]);
    }
}
