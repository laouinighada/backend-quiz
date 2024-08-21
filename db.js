const express = require('express');
const { Client } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json()); // Utilisez body-parser pour analyser les corps de requête JSON

const port = 3000;

// Configuration de la connexion à la base de données
const client = new Client({
    host: 'localhost',
    user: 'postgres',
    port: 5432,
    password: '123456789',
    database: 'Dotcom'
});

client.connect();

// Définir une route pour récupérer les utilisateurs
app.get('/users', (req, res) => {
    client.query('SELECT nom, prenom FROM "User"', (err, result) => {
        if (err) {
            res.status(500).send(err.message);
        } else {
            res.status(200).json(result.rows);
        }
    });
});

// Définir une route pour récupérer les questions de quiz et leurs choix
app.get('/quiz', async (req, res) => {
    try {
        const questionsResult = await client.query('SELECT * FROM questions');
        const questions = questionsResult.rows;

        for (let question of questions) {
            const choicesResult = await client.query('SELECT id, choice_text, is_correct FROM choices WHERE question_id = $1', [question.id]);
            question.choices = choicesResult.rows;
        }

        res.status(200).json(questions);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Définir une route pour ajouter un quiz
app.post('/quiz', async (req, res) => {
    const { question_text, choices } = req.body;

    // Ajout de logs pour déboguer
    console.log('Requête reçue : ', req.body);

    if (!question_text || !choices || !Array.isArray(choices)) {
        return res.status(400).send('Invalid request data');
    }

    try {
        // Commencer une transaction
        await client.query('BEGIN');

        // Insérer la question dans la table des questions
        const questionResult = await client.query(
            'INSERT INTO questions (question_text) VALUES ($1) RETURNING id',
            [question_text]
        );
        const questionId = questionResult.rows[0].id;

        // Insérer les choix associés à la question
        for (let choice of choices) {
            await client.query(
                'INSERT INTO choices (question_id, choice_text, is_correct) VALUES ($1, $2, $3)',
                [questionId, choice.choice_text, choice.is_correct]
            );
        }

        // Valider la transaction
        await client.query('COMMIT');

        res.status(201).send('Quiz added successfully');
    } catch (err) {
        // Annuler la transaction en cas d'erreur
        await client.query('ROLLBACK');
        res.status(500).send(err.message);
    }
});

// Démarrer le serveur
app.listen(port, () => {
    console.log("Server running on http://localhost:${port}");
});
