var URL = "http://twserver.alunos.dcc.fc.up.pt:8000/";
var user;
var group=20;
var pass;
var level; // temporario
var cols; 
var rows; 
var multiplayer=false;
var my_bombs=0;
var enemy_bombs=0;
var reqEnemy;
var game;
var key;
var mines_left; // vai ser usada para single mode
var n_bombs; // vai ser usada para single mode
var time=0; // vai ser usada para single mode
var n_visited=0; // vai ser usada para single mode
var gameOver=false; // vai ser usada para single mode
var primeira_jogada=0; // vai ser usada para single mode
var easyscore = JSON.parse(localStorage.getItem("beginner")) || [];
var medscore = JSON.parse(localStorage.getItem("intermediate")) || [];
var hardyscore = JSON.parse(localStorage.getItem("expert")) || [];

function init_mulbeg(){
    document.getElementById("startgamebtn").disabled=false;
    level="beginner";
    cols=9;
    rows=9;
    mines_left=10; // para single mode
    n_bombs=10; // para single mode
}

function init_mulmed(){
    document.getElementById("startgamebtn").disabled=false;
    level="intermediate";
    cols=16;
    rows=16;
    mines_left=40; //single mode
    n_bombs=40; // single mode
}

function init_mulhard(){
    document.getElementById("startgamebtn").disabled=false;
    level= "expert";
    cols=16;
    rows=30;
    mines_left=99; //single mode
    n_bombs=99; // single mode
}

function single_enable(){
    document.getElementById("multiplayerbtn").disabled = true;
    document.getElementById("begbtn").disabled = false;
    document.getElementById("medbtn").disabled = false;
    document.getElementById("hardbtn").disabled = false;   
}

function group_display(){
    //document.getElementById("multiplayerbtn").disabled =true;   
    document.getElementById("singlebtn").disabled = true;
    document.getElementById("begbtn").disabled = false;
    document.getElementById("medbtn").disabled = false;
    document.getElementById("hardbtn").disabled = false;
    multiplayer=true;
 
}

function login() {

	if(document.querySelector("#inputUserName").value === "" || document.querySelector("#inputUserPassword").value === "") {
            alert("Necessário introduzir nome de utilizador e a tua password");
            return;
	}
    
    if(!(/^[a-zA-Z]+/.test(document.querySelector("#inputUserName").value)) || document.querySelector("#inputUserName").value.length <3) {
        alert("Nome de utilizador deve ser constituido por 2 caracteres no minino, sem caracteres especiais e conter letras");
        return;
    }
/* 
    if(document.querySelector("#inputUserPassword").value.length < 5 || !(/[a-z]+/.test(document.querySelector("#inputUserPassword").value)) || !(/[A-Z]+/.test(document.querySelector("#inputUserPassword").value)) || !(/\d+/.test(document.querySelector("#inputUserPassword").value))) {
        alert("Necessário introduzir password constituida por pelo menos uma letra maiúscula, uma minúscula e um dígito com mais de 4 caracteres");
        return;
    }
*/
    //tudo certo no login

    user = document.querySelector("#inputUserName").value;
	pass = document.querySelector("#inputUserPassword").value;
	
    // objecto JSON login

    var loginInfo = JSON.stringify({'name': user, 'pass': pass});
	// novo request
	var req = new XMLHttpRequest();	
	
    req.open("POST", URL + "register", true);
    req.setRequestHeader('Content-Type', 'application/json');

    req.onreadystatechange = function() {
            if(req.readyState != 4) return;
    
            if(req.status != 200) {
                alert(req.status + ": " + req.statusText);
                return;
            }
            
            // obter/converter resposta JSON
            var response = JSON.parse(req.responseText);
            if(response.error != undefined) {
                alert("O utilizador ou a palavra-chave estão erradas");
                document.querySelector("#login input[type='text']").value = "";
                document.querySelector("#login input[type='password']").value = "";
                document.querySelector("#login input[type='text']").focus();
                return;
            }
        document.getElementById("sign").style.color="green";
            // servidor confirma o registo e da opção de logout

        document.getElementById("welcome").innerHTML = "Welcome, "+user;
        document.getElementById("inputUserName").value = "";
        document.getElementById("inputUserPassword").value = "";
        
        document.getElementById("inputUserName").disabled = true;
        document.getElementById("inputUserPassword").disabled = true;

        document.getElementById("singlebtn").disabled =false;
        document.getElementById("multiplayerbtn").disabled =false;
        // disable no botao login
        document.getElementById("sign").disabled = true;
    };    
    req.send(loginInfo);
    //enviar informações para a start(group,user,pass,level);
}

function join() {

    document.getElementById("startgamebtn").style.display= "none";
    document.getElementById("loadingx").style.display= "block";
    
    if(!multiplayer){
        document.getElementById("loadingx").style.display="none";
        modosingle();
        return;
    }
    
    document.getElementById("load_opponent").innerHTML = "Searching an enemy for you";  
    document.getElementById("mul_leave").style.display="block"; // permite mostrar o botão para sair dá fila     

    var joinInf = JSON.stringify({'name': user, 'pass': pass, 'level':level, 'group':group});
    var req = new XMLHttpRequest();
            
    req.open("POST", URL+"join", true);
    req.setRequestHeader('Content-Type', 'application/json');

    req.onreadystatechange = function() {
        if(req.readyState != 4)
            return;
        if(req.status != 200) {
            alert(req.status + ": " + req.statusText);
            return;
        }
    
        var response = JSON.parse(req.responseText);
        if(response.error){
            alert("erro de servidor: " + response.error);
            return;
        }
        //alert(req.responseText);

        game = response["game"];   //id do jogo identificado pelo servidor FUNÇÂO UPDATE DO SERVER
        key = response["key"];     //chave para o acesso ao jogo gerado pelo servidor FUNÇÂO UPDATE DO SERVER
        
        //alert("Estamos a procurar um adversário :)");

        console.log(URL + "update?name=" + user + "&game=" + game + "&key=" + key);
        reqEnemy = new EventSource(URL + "update?name=" + user + "&game=" + game + "&key=" + key);
    
        reqEnemy.onmessage = function(event) { //server-sent event
            var response = JSON.parse(event.data); //traduzir a resposta JSON do servidor 
            if(response.turn==user) turn(1);
            if(response.winner !== undefined) {
                if(user === response.winner){ 
                    // servidor responde com nome do user (winner)
                    alert("Parabéns!! Ganhaste o Jogo contra o teu adversário!");
                    showPlayerScore(response.winner);
                    reqEnemy.close();
                    
                }else{
                    alert("O teu adversário " + response.winner + " venceu o jogo!");
                    reqEnemy.close();
                }
            }

            if(response.move == undefined) {
                 newGame(); //criar tabela
                enemy = response.opponent;
                // informacao das jogadas
                var cell;
                var row;

                if(response.turn == user){ // é a minha vez de jogar
                    alert("O jogo começou, o teu adversário é " + enemy + ". Começas tu a jogar");        
                    document.getElementById("loadingx").style.display="none";
                    document.getElementById("load_opponent").style.display="none";
                    document.getElementById("mul_leave").style.display="none";
                    document.getElementById("mul_player_progress").style.display="block";
                    document.getElementById("enemymul_bomb_progress").style.display="block";
                    document.getElementById("mymul_bomb_progress").style.display ="block";
                   
                    console.log(response);   

                    var board=document.getElementById("tabela");                    
                    
                    board.onclick = function (e)
                        {
                            var cell=e.target.cellIndex;
                            var row= e.target.parentNode.rowIndex;
                            //console.log("row-"+row+", cell "+cell);
                            mymove(key,game,row+1,cell+1);
                        }
                  
                    }

                else{ 
                    alert("O jogo começou, o teu adversário é " + enemy + ". Começa o teu adversário a jogar");
                    document.getElementById("loadingx").style.display="none";
                    document.getElementById("load_opponent").style.display="none";
                    document.getElementById("mul_player_progress").style.display="block";
                    document.getElementById("enemymul_bomb_progress").style.display="block";
                    document.getElementById("mymul_bomb_progress").style.display ="block";
                    document.getElementById("mul_leave").style.display="none";
                    console.log(response);
                  

                    var board=document.getElementById("tabela");                    
                    
                    board.onclick = function (e)
                        {
                            var cell=e.target.cellIndex;
                            var row= e.target.parentNode.rowIndex;
                            //console.log("row-"+row+", cell "+cell);
                            mymove(key,game,row+1,cell+1);
                        }
                    }
                }//move != undefined
            else 
            { // server replies with move != undefined so we must update the field
                
                var move = response.move; // jogada do servidor
                var cells= move.cells;
                var r;
                var c;
                var nm;

                cells.forEach(function(cell) {
                     r = cell[0];
                     c = cell[1];
                     nm = cell[2];
                   
                if(move.name === user) 
                {
                    
                    if(nm === -1)
                    {  
                        fillBoard(r-1,c-1,nm);
                        progress("me");
                        console.log("uma bomba");
                    }
                    else
                    {
                        fillBoard(r-1,c-1,nm); // pq os nossos indices começam em 0 e os do professor em 1
                        console.log("deves alterar r="+r+", "+c+"e "+nm );
                        //document.getElementById("c."+(r-1)+"."+(c-1)).style.backgroundImage="url('./img/1.png')";
                    }
                }   
                else{
                    
                    if(nm === -1)
                    {  
                        progress("enemy");
                        fillBoard(r-1,c-1,nm);
                        console.log("uma bomba");
                    }
                    else
                    {
                        fillBoard(r-1,c-1,nm);
                        console.log("deves alterar r="+r+", "+c+"e "+nm );
                        //document.getElementById("c."+(r-1)+"."+(c-1)).style.backgroundImage="url('./img/1.png')";
                    }
                } 
                });
            }

        }; //onmessage
    }; //onreadystatechange
    req.send(joinInf);
}               
function showPlayerScore(vencedor){

    var winnerScore = JSON.stringify({'name': user, 'level': level});
    // novo request
    var req = new XMLHttpRequest(); 
    
    req.open("POST", URL + "score", true);
    req.setRequestHeader('Content-Type', 'application/json');

    req.onreadystatechange = function() {
        if(req.readyState != 4) return;
        if(req.status != 200) {
            alert(req.status + ": " + req.statusText);
            return;
        }

    var response = JSON.parse(req.responseText);

        if(response.error !== undefined) 
            alert(response.error);

    alert("O teu score: "+response.score);
};
req.send(winnerScore);

}


function fillBoard(r,c,nm){
    if(nm===0)
        document.getElementById("c."+(r)+"."+(c)).style.backgroundImage="url('./img/opened.png')";
    if(nm===1)
        document.getElementById("c."+(r)+"."+(c)).style.backgroundImage="url('./img/1.png')";
    if(nm===2)
        document.getElementById("c."+(r)+"."+(c)).style.backgroundImage="url('./img/2.png')";
    if(nm===3)
        document.getElementById("c."+(r)+"."+(c)).style.backgroundImage="url('./img/3.png')";
    if(nm===4)
        document.getElementById("c."+(r)+"."+(c)).style.backgroundImage="url('./img/4.png')";
    if(nm===5)
        document.getElementById("c."+(r)+"."+(c)).style.backgroundImage="url('./img/5.png')";
    if(nm===6)
        document.getElementById("c."+(r)+"."+(c)).style.backgroundImage="url('./img/6.png')";
    if(nm===7)
        document.getElementById("c."+(r)+"."+(c)).style.backgroundImage="url('./img/7.png')";
    if(nm===8)
        document.getElementById("c."+(r)+"."+(c)).style.backgroundImage="url('./img/8.png')";
    if(nm===-1)
        document.getElementById("c."+(r)+"."+(c)).style.backgroundImage="url('./img/clicked_bomb.png')";
}

function progress(playerprog){
    if(playerprog === "me"){
        my_bombs++;
        document.getElementById("mybombs1").innerHTML =my_bombs;
    }
    else{
        enemy_bombs++;
        document.getElementById("enemybombs1").innerHTML = enemy_bombs;
    }
}

function turn(turn){
    if(turn == 1)
    {
        console.log("entrei no turn do me");
        document.getElementById("icon_player").style.width='70px';
        document.getElementById("icon_player").style.height='70px';
    }

    if(turn == 2)
    {
        console.log("mudar tamanho");
        document.getElementById("icon_player").style.width='50px';
        document.getElementById("icon_player").style.height='50px';
    }
    
}

function tableofHonor(){
    if(!multiplayer)
         {
            honor();
            return;
        }
    document.getElementById("honor_mul").style.display="block";
    
    var theWinnersOf = JSON.stringify({'level': level}); 
    var req = new XMLHttpRequest();
    req.open("POST", URL+"ranking", true);
    req.setRequestHeader('Content-Type','application/json');

    
    req.onreadystatechange = function() {
        if(req.readyState != 4) return;
        if(req.status != 200) {
            alert(req.status + ": " + req.statusText);
            return;
        }
    var response = JSON.parse(req.responseText);

        if(response.error !== undefined) 
            alert(response.error);

        //aqui dentro da callback criar a tabela para representar a informação da tableofHonor 

        var container = document.getElementById("honor_mul"); // onde a tabela vai ser criada

        var table = document.createElement('table');
        table.setAttribute("class","test");
        table.setAttribute("id","table_rank");
        
        var tableRow = table.insertRow(0);
        var tableCell = tableRow.insertCell(0);

        tableCell.appendChild(document.createTextNode("Rank"));
        container.appendChild(table);

        tableCell = tableRow.insertCell(1);
        tableCell.appendChild(document.createTextNode("Nome"));
        container.appendChild(table);

        tableCell = tableRow.insertCell(2);
        tableCell.appendChild(document.createTextNode("Score"));
        container.appendChild(table);    

    for( var i=1; i<=10; i++){
        var entrada = response.ranking[i];
        if(response.ranking[i] != undefined){

            var tableRow = table.insertRow(i);
            var tableCell = tableRow.insertCell(0);
            tableCell.appendChild(document.createTextNode(i));
            container.appendChild(table);

            var tableCell = tableRow.insertCell(1);
            tableCell.appendChild(document.createTextNode(entrada.name));
            container.appendChild(table);

            var tableCell = tableRow.insertCell(2);
            tableCell.appendChild(document.createTextNode(entrada.score));
        }
    }
};
req.send(theWinnersOf);
}
function mymove(key,game,x,y){


    var mycall = JSON.stringify({'name': user, 'game': game, 'key': key, 'row': x, 'col': y});
    var req = new XMLHttpRequest();
    req.open("POST", URL+"notify", true); 
    req.setRequestHeader('Content-Type', 'application/json');          
   
    req.onreadystatechange = function() {
        if(req.readyState != 4) return;
        if(req.status != 200) {
            alert(req.status + ": " + req.statusText);
            return;
        }
        var response = JSON.parse(req.responseText);
        console.log(response);
        if(response.error !== undefined) 
            alert(response.error);
    };  
    req.send(mycall);
    turn(2);
}

function leave() {
    
    var quitInfo = JSON.stringify({'name': user, 'game': game, 'key': key});
    var req = new XMLHttpRequest();

    req.open("POST", URL + "leave", true);
    req.setRequestHeader('Content-Type', 'application/json');

    req.onreadystatechange = function() {
        if(req.readyState != 4) 
            return;
        if(req.status != 200) {
            alert(req.status + ": " + req.statusText);
            return;
        }
        alert("Saiste da fila de espera para aceder ao jogo");
        reqEnemy.close();
        location.reload();
      };
    req.send(quitInfo);
}

function newGame(){
    document.getElementById("homedisplay").style.display ='none';
    document.getElementById("tab").style.display = 'block';
    
    var board=document.getElementById("tabela");
 
    for(var i=0;i<rows;i++)
    {
        var row = board.insertRow();
 
        for(var j=0;j<cols;j++)
        {
            var cell = row.insertCell();
            cell.id=("c."+i+"."+j);
            cell.style.backgroundImage="url('./img/unopened.png')";
            cell.style.backgroundSize='cover';
        }
    }
}

function getout(){
    document.getElementById("honor_mul").style.display="none";
    document.getElementById("table_rank").remove();
}

// modo single

function modosingle(){
     time=0;
     n_visited=0;
    //clearTable();
    campo = new Array();
    for(var i=0;i<cols;i++)
    {
        campo[i]=new Array();
        for(var j=0;j<rows;j++)
        {
            campo[i][j]=0;
        }
    }
 
    for(var i=0;i<n_bombs;i++)
    {
        var x=Math.floor(Math.random()*(cols-1));
        var y=Math.floor(Math.random()*(rows-1));
        campo[x][y]=-1;
    }
 
    for(var i=0;i<cols;i++)
    {
        for(var j=0;j<rows;j++)
        {
            if(!isBomb(i,j)) campo[i][j]=neighbours(i,j);
        }
    }
 
    visited=new Array();
 
        for (var i=0;i<cols;i++)
        {
                visited[i]=new Array();
 
                for (var j=0;j<rows;j++)
                {
                        visited[i][j]=false;
                }
        }
    play();
}

function play(){
    document.getElementById("homedisplay").style.display ='none';
    document.getElementById("tab").style.display = 'block';

    var board=document.getElementById("tabela");

    for(var i=0;i<cols;i++)
        {
            var row= board.insertRow();
     
            for(var j=0;j<rows;j++)
            {
                var cell = row.insertCell();
                cell.id=("c."+i+"."+j);
                cell.isFlagged=false;
                cell.isValid=true;
                cell.isQuestionMark=false;
                cell.style.backgroundImage="url('./img/unopened.png')";
                cell.style.backgroundSize='cover';
            }
        }

     playing();
   
    function right_click(x,y)
    {
        var celula = document.getElementById("c."+x+"."+y);

        if(celula.isFlagged && !visited[x][y])
        {  
            celula.isFlagged=false;
            mines_left++;            
            celula.isQuestionMark=true;
            celula.isValid=true;
            document.getElementById("c."+(x)+"."+(y)).style.backgroundImage= "url('./img/question_mark.png')";
            document.getElementById("mybombs1").innerHTML=mines_left;
       
        }
 
        else if( !celula.isFlagged && !celula.isQuestionMark && !visited[x][y])
        {
            celula.isFlagged=true;
            celula.isValid=false;
            celula.isQuestionMark=false;
            document.getElementById("c."+(x)+"."+(y)).style.backgroundImage="url('./img/flag.png')";
            mines_left--;
            document.getElementById("mybombs1").innerHTML=mines_left;
        }
     
       else if(!celula.isFlagged && celula.isQuestionMark && !visited[x][y]){
            document.getElementById("c."+(x)+"."+(y)).style.backgroundImage="url('./img/unopened.png')";
            celula.isQuestionMark=false;
            celula.isValid=true;
        }
       
        document.getElementById("bombas").innerHTML = mines_left;
        playing();
    }

    function playing()
    {
       
            board.oncontextmenu = function teste(e){
                var  cellIndex = e.target.cellIndex;
                var rowIndexx = e.target.parentNode.rowIndex;            
                right_click(rowIndexx, cellIndex);
            }
         
            board.onclick = function (e)
            {
                var rowIndex=e.target.cellIndex;
                var cellIndex= e.target.parentNode.rowIndex;
                var c=document.getElementById("c."+cellIndex+"."+rowIndex);
                console.log("coluna: "+cellIndex+" linha: "+rowIndex);          
                if(primeira_jogada == 0 ){
                    timer();
                    document.getElementById("mymul_bomb_progress").style.display="block";
                    document.getElementById("mybombs1").innerHTML=n_bombs;
                }
         
                if(isBomb(cellIndex,rowIndex) && primeira_jogada==0)
                {
                    moveBomb(cellIndex,rowIndex);
                    refresh();
                }
 
                primeira_jogada++;
         
                refresh();
                if(c.isValid) expandir(cellIndex,rowIndex,true);
                if(win())
                {
                    ganhou();
                }
         
            }
     
        function refresh()
        {
            for(var i=0;i<cols;i++)
            {
                for(var j=0;j<rows;j++)
                {
                    if(!isBomb(i,j)) campo[i][j]=neighbours(i,j);
                }
            }
        }
    }

}//fecha play

function moveBomb(x,y){
    var moved=false;
 
    for(var i=0;i<rows;i++)
    {
        for(var j=0;cols;j++)
        {
            if(!isBomb(j,i) && campo[j][i]==0)
            {
                campo[j][i]=-1;
                moved=true;
                break;
 
            }
        }
 
      if(moved==true)
        {
            campo[x][y]=neighbours(x,y);
          break;
        }
    }
 
}
function honor()
{
    document.getElementById("honor_mul").style.display="block";

        var container = document.getElementById("honor_mul"); // onde a tabela vai ser criada

        var table = document.createElement('table');
        table.setAttribute("class","test");
        table.setAttribute("id","table_rank");
        
        var tableRow = table.insertRow(0);
        var tableCell = tableRow.insertCell(0);

        tableCell.appendChild(document.createTextNode("Rank"));
        container.appendChild(table);

        tableCell = tableRow.insertCell(1);
        tableCell.appendChild(document.createTextNode("Nome"));
        container.appendChild(table);

        tableCell = tableRow.insertCell(2);
        tableCell.appendChild(document.createTextNode("Score"));
        container.appendChild(table);    

    for( var i=0; i<10; i++){
        {
            var d = JSON.parse(localStorage.getItem(""+level));
            if(i<d.length)
            {
                var teste = JSON.parse(localStorage.getItem("beginner"));
                var tableRow = table.insertRow();
                var tableCell = tableRow.insertCell(0);
                tableCell.appendChild(document.createTextNode(i+1));
                container.appendChild(table);
                var tableCell = tableRow.insertCell(1);
                tableCell.appendChild(document.createTextNode(d[i].name));
                container.appendChild(table);
                var tableCell = tableRow.insertCell(2);
                tableCell.appendChild(document.createTextNode(d[i].score));
            }
        }
    }
}
function neighbours(x,y){
    var count=0
  if(!isBomb(x,y))
  {
    for(var a=x-1;a<=x+1;a++)
    {
        for(var b=y-1;b<=y+1;b++)
        {
            if(a>=0 && b>=0 && a<cols && b<rows)
            {
                if(isBomb(a,b)) count++;
            }
        }
    }
  }
  return count;
}

function isBomb(x,y){
    if(campo[x][y]==-1) return true;
    else return false;
}
 
function expandir(x,y,clicked){
    var minas_around;
    if( valida(x,y)==false  || visited[x][y]==true ) // se ja foi destapada ou nao existe
    {          
        return; // condicao de paragem na recursao da expansao
    }
    
    if (clicked  && isBomb(x,y))
    {
    document.getElementById("c."+(x)+"."+(y)).style.backgroundImage="url('./img/clicked_bomb.png')";
    showAllBombs();
    lose();
    return;
    }
 
    visited[x][y]=true;
    n_visited++;
   
    minas_around = campo[x][y];
 
    if (minas_around > 0)
    {
        // so mostra o seu numero
        document.getElementById("c."+(x)+"."+(y)).style.backgroundImage="url('./img/"+minas_around+".png')";
     
    }
    else
    {
        document.getElementById("c."+(x)+"."+(y)).style.backgroundImage="url('./img/opened.png')";
        
        //aqui vai recursao
 
        for (var i = x-1; i <= x+1; ++i)
        {
            for (var j = y-1; j <= y+1; ++j)
            {
                // Exclui a posição actual
                if (i != x || j != y)
                {
                    expandir(i, j, false);   // Chamada recursiva
                }
            }
        }
    }
}

function valida(x,y)
{
    if(x>=0 && y>=0 && x<cols && y<rows)
        return true;
    else
        return false;
}

function showAllBombs(){
    for(var i=0;i<cols;i++)
        {
            for(var j=0;j<rows;j++)
            {
 
               if(isBomb(i,j))
                {
                    document.getElementById("c."+(i)+"."+(j)).style.backgroundImage="url('./img/clicked_bomb.png')";
                }
            }
        }
    document.getElementById("tabela").onclick=null;                 
    document.getElementById("tabela").oncontextmenu=null;
    console.log("Ups, perdeste tenta de novo para a próxima!");
    stop_timer();
}

function win(){   
    var cell;
    var contador=0;
    var x = (rows*cols)-n_bombs;
    for(var i=0;i<cols;i++)
    {
        for(var j=0;j<rows;j++)
        {   
            if(visited[i][j]==true && !isBomb(i,j))
            {
                contador++;
            }
        }
    }

    if(contador==x) return true;     
    else return false;
}

function clearTable(){   
     var table= document.getElementById("tabela");
     while ( table.rows.length > 0 )
     {
      table.deleteRow(0);
     }
}

function ganhou()
{
    stop_timer();
    document.getElementById("tabela").onclick=null;                 
    document.getElementById("tabela").oncontextmenu=null;
    if(level=="beginner")
    {
        easyscore.push({name:user,score:time});
        easyscore.sort(function(a, b) 
        {
            return parseFloat(a.score) - parseFloat(b.score);
        });
        localStorage.setItem("beginner",JSON.stringify(easyscore));
        honor();
    }
    if(level=="intermediate")
    {
        medscore.push({name:user,score:time});
        medscore.sort(function(a, b) 
        {
            return parseFloat(a.score) - parseFloat(b.score);
        });
        localStorage.setItem("intermediate",JSON.stringify(medscore));
        honor();
    }
    if(level=="expert")
    {
        hardyscore.push({name:user,score:time});
        hardyscore.sort(function(a, b) 
        {
            return parseFloat(a.score) - parseFloat(b.score);
        });
        localStorage.setItem("expert",JSON.stringify(hardyscore));
        honor();
    }
    clearTable();
}

function lose(){
    alert("Ups perdeste o jogo, tenta para a proxima");
    //location.reload();
}

function timer(){
    document.getElementById("mul_clock_progress").style.display="none";
    document.getElementById("mycanvas").style.display="block";
    draw();
}

var trigger=0;

function draw() {
    var c=document.getElementById("mycanvas");
    var ctx=c.getContext("2d");
    time = 0;
    var start = 4.72;
    var cw = ctx.canvas.width;
    var ch = ctx.canvas.height; 
    var diff;

    function justdoit(){
        
        diff = ((time / 100) * Math.PI*2*10);
        
        ctx.clearRect(0, 0, cw, ch);
        ctx.lineWidth = 10;
        
        ctx.fillStyle = '#09F';
        ctx.strokeStyle = "#09F";
        ctx.textAlign = 'center';
        ctx.font="30px Arial";
        ctx.lineWidth = 15;
        
        ctx.fillText( time+'s', cw*.25, ch*.5, cw);
        ctx.beginPath();
        
        ctx.arc(75, 75, 60, start, diff/10+start, false);
        ctx.stroke();
        
        if(time >= 100){
            ctx.clearRect(0, 0, cw, ch);
            time = 0;
        }
        time++;
    }
     trigger = setInterval(justdoit, 1000);
}

function stop_timer(){
    console.log("vou parar");
    clearInterval(trigger);
}