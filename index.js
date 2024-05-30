const express = require('express');
const cors = require('cors');
const pool = require('./db');
const app = express();

//middleware
app.use(cors());
app.use(express.json());
//app.use(bodyParser.json());

//============================================================================
function echappement(query) {
  
    let echapper = '';
  
    for (let i = 0; i < query.length; i++) {
      const char = query[i];
  
      if (char === '\'') {
        echapper += '\'' + char;// Échapper le caractère spécial
      } else {
        echapper += char; // Ajouter le caractère tel quel
      }
    }
    
return echapper;
}
//============================================================================

// ROUTE
// Insert
app.get('/essai',async(req,res)=>{
    const compta = pool.connecter('dsociete')
    try{
        const q='select * from devise'
        const essai = await compta.query(q);
        res.json(essai);
    }catch(err){
        console.error(err);
    }
});

const listColonnes = async (bdd,tab) => {
    q = "SELECT * FROM info_champs WHERE TABLE_NAME = '"+tab+"' "+
    " ORDER BY rang";
    const allColumns = await pool.connecter(bdd).query(q);
    return allColumns.rows;
}

app.get('/colonnes/:bdd/:tab',async(req,res)=>{
    try{
        const {bdd,tab}=req.params;
        const colonnes = await listColonnes(bdd,tab);
        res.json(colonnes);
    }catch(err){
        console.error(err);
    }
});

app.post('/creerbdd/:bdd', async(req,res)=>{
    const {bdd}=req.params;
    const q = 'CREATE DATABASE '+bdd+' TEMPLATE exercice_vide'
    const allMP = await pool.connecter('postgres').query(q); //ORDER BY id
    res.json(allMP.rows);
})

app.post('/requete/:bdd', async(req,res)=>{
    let resultat = ''
    try {

        const {bdd}=req.params;
        const q = req.body[0].sql
        console.log(req.body)
        const allMP = await pool.connecter(bdd).query(q); //ORDER BY id  
        if (allMP==null){
            res.json('Erreur SQL')
        }else if (Array.isArray(allMP)===false){
                res.json(allMP.rows)
        }
        else{
            res.json(allMP[allMP.length-1].rows);
        }
    
    }catch (err){
        res.json('Erreur Serveur :'+err)
    }
})

app.post('/ajout2/:bdd/:tab', async(req,res)=>{
	console.log(1)
});
//Ajout
app.post('/ajout/:bdd/:tab', async(req,res)=>{
    try {
		console.log('1')
        const {bdd,tab}=req.params;
        console.log(1,bdd,tab)
        console.log(2,req.body)
        const colonnes= await listColonnes(bdd,tab);
        
        let insertInto = 'INSERT INTO '+tab+'(';
        let values = ' VALUES(';
        let i = 0;
		
        //console.log(3,colonnes.length)
        //colonnes.forEach((colonne, index) => {
        //  console.log(colonne.column_name)
		//});
        
		colonnes.forEach((colonne, index) => {
            // console.log(1,index)
            Object.keys(req.body).forEach(function(key){
                if (key == colonne.column_name){
                    // console.log(key,colonne.column_name)
                    i++;
                    const numericType =['smallint','integer','bigint','decimal','numeric','real','double precision','smallserial','serial','bigserial'];
                    
                    let oneValue = req.body[key];
                    // if (!numericType.includes(colonne.data_type)){
                    //         oneValue = "'" +echappement(oneValue)+"'";
                    // };
                    if (req.body[key]!==null && req.body[key]!==''&& key!=='m_debit'&& key!=='m_credit'){
                        if (!numericType.includes(colonne.data_type)){
                            oneValue = "'" +echappement(oneValue)+"'";
                        };
                        values = values + oneValue;
                        insertInto = insertInto + key;
                        if (i<(Object.keys(req.body).length)){
                            insertInto =insertInto +',';
                            values = values +',';
                        }
                    }    
                }
            });
            // console.log(2,index)
        });
        // console.log('2')
        if (insertInto.charAt(insertInto.length-1)===','){
            insertInto = insertInto.slice(0,insertInto.length-1);
        }
        insertInto = insertInto +')';
        if (values.charAt(values.length-1)===','){
            values = values.slice(0,values.length-1);
        }
        values = values +')';
        const q = insertInto + values;
        console.log(q)
        
        const newmp = await pool.connecter(bdd).query(q);
        // console.log(newmp.rowCount)
        // res.json(newmp.rowCount);

        const newID = await pool.connecter(bdd).query("SELECT MAX(id) AS new_id FROM "+tab)
        
        res.json(newID.rows[0].new_id);


    }catch (err){
        res.json(err);
        console.error(err);
    }
});

//Afficher tout
app.post('/affiche_avec_critere/:bdd/:tab',async(req,res)=>{
    try{
		const {bdd,tab}=req.params;
        console.log(tab,bdd)
		console.log(req.body.critere)
		if (req.body==={})
			critere = ''
		else
			critere = req.body.critere
        const allMP=await pool.connecter(bdd).query("SELECT * FROM "+tab+" "+critere); //ORDER BY idpool
        console.log(allMP.rows.length)// tsy azo fafana
		res.json(allMP.rows);
    }catch(err){
        console.error(err);
    }
});

app.get('/affiche/:bdd/:tab',async(req,res)=>{
    try{
		const {bdd,tab}=req.params;
        console.log(tab,bdd)
	    const allMP=await pool.connecter(bdd).query("SELECT * FROM "+tab); //ORDER BY idpool
    	res.json(allMP.rows);
    }catch(err){
        console.error(err);
    }
});



app.post('/affiche_aveclib/:bdd/:tab',async(req,res)=>{
    try{
        const {bdd,tab}=req.params;
        const allColumns = await listColonnes(bdd,tab);
        sel='';
        join='';
        first=true;
        let ordre=[]
        let i=0;
        allColumns.forEach((element,i)=>{
            let lst =''
            if (element.lstfield===element.keyfield) 
                lst = element.keyfield
            else
                lst =element.lstfield+',' +element.keyfield
            let ndfListe = '(SELECT '+lst+' FROM '+ element.ndfliste+' GROUP BY '+lst+') AS '+'a'+i
            if ((element.masque==='Liste' || element.masque==='DebSel')&& element.column_name!=='fokontany'){
                if (!first) 
                    sel= sel+', ';
                sel= sel+ 'a'+i+'.'+element.lstfield+' AS lib_'+element.column_name;
                join=join+' LEFT JOIN '+ndfListe+' ON '+ tab+'.'+ element.column_name+'='+'a'+i+'.'+element.keyfield
                first=false;
            }
            if(element.rang_order_by>0){
                // if(element.rang_order_by===1) column_order1=element.column_name;
                ordre[element.rang_order_by-1]=element.column_name
                // i=i+1;
            }
        })
        let order_by='';
        ordre.forEach((val,i)=>{
            order_by=order_by+val+','
        })
        if (sel!=='') sel=','+ sel;
            if (order_by.charAt(order_by.length-1)===','){
                order_by = order_by.slice(0,order_by.length-1);
        }
        
        let sql="SELECT "+tab+".* "+sel+" FROM "+tab+" "+join;
        // console.log(req.body[0])
        Object.keys(req.body[0]).forEach(key => {
            if (key!='vide'){
                if (key.substring(0,7)==='varchar')
                    sql= sql + " WHERE " + key.substring(8,45) +"  = '"+ req.body[0][key]+"'" 
                else
                    sql= sql + " WHERE " + key.substring(8,45) +"  = "+ req.body[0][key] 
            }
          });
        //   console.log(sql)
        // if (tab==='classe_compte') console.log(sql)
        if (order_by>'') 
            sql=sql+' ORDER BY '+order_by;
        // console.log(sql)
        const allMP = await pool.connecter(bdd).query(sql); //ORDER BY id
            // console.log(allMP.rows)
        res.json(allMP.rows);
        
    }catch(err){
        console.error(err);
    }

});

//afficher 1 element
'http://localhost:5000/affiche-critere/s2102021/journal/int/id/468'

app.get('/affiche-critere/:bdd/:tab/:typ/:col/:id',async(req,res)=>{
    try{
        const {bdd,tab,typ,col,id}=req.params;
        let critere=id
        if (typ==='char')critere="'"+id+"'"
        const mp=await pool.connecter(bdd).query("SELECT * FROM "+tab+" WHERE "+col+"="+critere);//
        if (mp.rows.length>1) res.json(mp.rows)
        else res.json(mp.rows[0]);
    }catch(err){
        console.error(err);
    }
});

app.delete('/suppr/:bdd/:tab/:typ/:col/:id', async(req,res)=>{
    try {
        const {bdd,tab,typ,col,id}=req.params;
        const tid=''+id
        if (typ==='char'){
            tid="'"+id+"'"
        }
        const mp = await pool.connecter(bdd).query('DELETE FROM '+tab+' WHERE '+col+'='+tid);
        res.json(' mp '+id+' was deleted');
    }catch (err){
        console.error(err.mess);
    }
});




app.put('/modif/:bdd/:tab/:id',async(req,res)=>{
    // console.log(0)

    try{
        const {bdd,tab,id}=req.params;
        const colonnes= await listColonnes(bdd,tab);
        
        let updateSet = "UPDATE "+tab+" SET ";
        
        let i = 0;
        // console.log('1')
        colonnes.forEach((colonne, index) => {
            Object.keys(req.body).forEach(function(key){
                if (key==colonne.column_name){
                    i++;
                    if (req.body[key]!==null){
                        updateSet = updateSet + key+' = ';
                        const numericType =['smallint','integer','bigint','decimal','numeric','real','double precision','smallserial','serial','bigserial'];
                        let oneValue = req.body[key];
                        if (!numericType.includes(colonne.data_type)){
                            oneValue = "'" +echappement(oneValue)+"'";
                        };
                        updateSet = updateSet + oneValue;
                        updateSet = updateSet +',';
                    }    
                }
            });
        });
        // console.log(2)
        
        updateSet = updateSet.slice(0,updateSet.length-1);
        updateSet = updateSet +' WHERE id='+id;

        // updateSet = echappement(updateSet);
        
        // console.log('REQUETE FINAL:  '+updateSet)
        const newmp = await pool.connecter(bdd).query(updateSet);
        res.json(newmp.rows[0]);
    }catch(err){
        console.error(err);
    }
     
});

app.get('/consulter-periode/:bdd/:periode/:journal',async(req,res)=>{
    try{
        const {bdd,periode,journal} = req.params;
        let perio=periode.substring(0,4)+"/"+periode.substring(5,8)
        let sql = "SELECT arreter FROM arrete WHERE periode='"+perio+"'  AND journaux='"+journal+"'"
        const p = await pool.connecter(bdd).query(sql);
        
        if (p.rows.length===1)
            res.json(p.rows[0]);
        else 
            res.json({ arreter: -2 })
    }catch(err){
        res.json(err);
    }
 
});

app.post('/maj-param-bdd/:bdd/:deb/:fin', async(req,res)=>{
    try {
        const {bdd,deb,fin}=req.params;
        const q = "UPDATE param_bdd SET debut_exercice='"+deb+"', fin_exercice='"+fin+"'"
        const allMP = await pool.connecter(bdd).query(q); //ORDER BY id
        if (allMP.rows.length===0)
            res.json('OK')
        else
            res.json(allMP.rows);
        
    }catch (err){
        res.json('Erreur')
    }
})

app.listen(5000, ()=>{
    console.log('server has started on port 5000');
}) 
