const Book = require("../models/book");
const Author = require("../models/author");
const Genre = require("../models/genre");
const InventoryItem = require("../models/inventoryitem");
const asyncHandler = require("express-async-handler");
const { MongoClient, ReturnDocument } = require("mongodb");
const { body, validationResult } = require("express-validator");

exports.index = asyncHandler(async (req, res, next) => {
  const [
    numBooks,
    numBookInstances,
    numAvailableBookInstances,
    numAuthors,
    numGenres,
  ] = await Promise.all([
    Book.countDocuments({}).exec(),
    InventoryItem.countDocuments({}).exec(),
    InventoryItem.countDocuments({ status: "Available" }).exec(),
    Author.countDocuments({}).exec(),
    Genre.countDocuments({}).exec(),
  ]);

  res.render("index", {
    title: "Local Library Home",
    book_count: numBooks,
    book_instance_count: numBookInstances,
    book_instance_available_count: numAvailableBookInstances,
    author_count: numAuthors,
    genre_count: numGenres,
  });
});

exports.book_list = asyncHandler(async (req, res, next) => {
  const books = await Book.find({}, "title author")
    .sort({ title: 1 })
    .populate("author")
    .exec();

  /*
  // doing it with mongodb driver (no mongoose)
  require("dotenv").config();
  const books = [];

  const url = process.env.MONGO_URL;
  const client = new MongoClient(url);

  async function run() {
    try {
      const database = client.db("local_library");
      const booksCol = database.collection("books");
      const authorsCol = database.collection("authors");

      const cursor = booksCol.find(
        {},
        {
          sort: { title: 1 },
          projection: { _id: 0, title: 1, author: 1 },
        }
      );

      if ((await booksCol.countDocuments({})) === 0) {
        console.log("No documents found");
      }

      for await (const doc of cursor) {
        const author = await authorsCol.findOne({ _id: doc.author });
        doc.author.name = `${author.first_name} ${author.family_name}`;
        doc.url = "www";
        books.push(doc);
      }
    } finally {
      await client.close();
    }
  }
  await run().catch(console.log);
  */

  res.render("booklist", { title: "Books", books: books });
});

exports.book_detail = asyncHandler(async (req, res, next) => {
  const book = await Book.findById(req.params.id)
    .populate("author genre")
    .exec();
  let inventory;

  if (book === null) {
    const err = new Error("Book not found");
    err.status = 404;
    return next(err);
  } else {
    inventory = await InventoryItem.find({ book: req.params.id }).exec();
  }

  res.render("book_page", {
    title: "Book Details",
    book: book,
    inventory: inventory,
  });
});

// Display book create form on GET.
exports.book_create_get = asyncHandler(async (req, res, next) => {
  const [allAuthors, allGenres] = await Promise.all([
    Author.find().sort({ family_name: 1 }).exec(),
    Genre.find().sort({ name: 1 }).exec(),
  ]);

  res.render("book_form", {
    title: "Create Book",
    authors: allAuthors,
    genres: allGenres,
    book: {},
    errors: [],
  });
});

// Handle book create on POST.
exports.book_create_post = [
  (req, res, next) => {
    console.log(req.body);
    next();
  },
  (req, res, next) => {
    if (!Array.isArray(req.body.genre)) {
      req.body.genre =
        typeof req.body.genre === "undefined" ? [] : [req.body.genre];
    }
    next();
  },

  body("title", "Title must not be empty").trim().isLength({ min: 1 }).escape(),

  body("author", "Author must not be empty")
    .trim()
    .isLength({ min: 1 })
    .escape(),

  body("summary", "Summary must not be empty")
    .trim()
    .isLength({ min: 1 })
    .escape(),

  body("isbn", "ISBN must not be empty").trim().isLength({ min: 1 }).escape(),

  body("genre.*").escape(),

  asyncHandler(async (req, res, next) => {
    const err = validationResult(req);

    const book = new Book({
      title: req.body.title,
      author: req.body.author,
      summary: req.body.summary,
      isbn: req.body.isbn,
      genre: req.body.genre,
    });

    if (!err.isEmpty()) {
      const [allAuthors, allGenres] = await Promise.all([
        Author.find().sort({ family_name: 1 }).exec(),
        Genre.find().sort({ name: 1 }).exec(),
      ]);
      // this is why we converted to array above
      for (const genre of allGenres) {
        if (book.genre.includes(genre._id)) {
          genre.checked = true;
        }
      }

      if (book.author) {
        for (const author of allAuthors) {
          if (book.author.toString() === author._id.toString()) {
            author.selected = true;
          }
        }
      }

      res.render("book_form", {
        title: "Create Book",
        authors: allAuthors,
        genres: allGenres,
        book: book,
        errors: err.array(),
      });
    } else {
      await book.save();
      res.redirect(book.url);
    }
  }),
];

exports.book_delete_get = asyncHandler(async (req, res, next) => {
  const [book, allInstances] = await Promise.all([
    Book.findById(req.params.id).exec(),
    InventoryItem.find({ book: req.params.id }).exec(),
  ]);

  if (book === null) {
    res.redirect("/catalog/books");
  }

  res.render("book_delete", {
    title: "Delete Book",
    book: book,
    instances: allInstances,
  });
});

exports.book_delete_post = asyncHandler(async (req, res, next) => {
  await Book.findByIdAndDelete(req.body.bookid);
  res.redirect("/catalog/books");
});

exports.book_update_get = asyncHandler(async (req, res, next) => {
  const [book, allAuthors, allGenres] = await Promise.all([
    Book.findById(req.params.id).exec(),
    Author.find().sort({ family_name: 1 }).exec(),
    Genre.find().sort({ name: 1 }).exec(),
  ]);

  if (book === null) {
    const err = new Error("Book not found");
    err.status = 404;
    return next(err);
  }

  const currentAuthorId = book.author;
  const currentGenres = book.genre;

  res.render("book_update", {
    title: "Update Book",
    book,
    allAuthors,
    allGenres,
    currentAuthorId,
    currentGenres,
    errors: [],
  });
});

exports.book_update_post = [
  (req, res, next) => {
    console.log(req.body.genre);
    if (!Array.isArray(req.body.genre)) {
      req.body.genre = req.body.genre === undefined ? [] : [req.body.genre];
    }
    console.log(req.body.genre);
    next();
  },

  body("title", "Title cannot be empty").trim().isLength({ min: 1 }).escape(),
  body("author", "Author cannot be empty").trim().isLength({ min: 1 }).escape(),
  body("summary").trim().escape(),
  body("isbn").trim().escape(),
  body("genre.*").escape(),

  asyncHandler(async (req, res, next) => {
    const book = new Book({
      _id: req.params.id,
      title: req.body.title,
      author: req.body.author,
      summary: req.body.summary,
      isbn: req.body.isbn,
      genre: req.body.genre,
    });

    const errors = validationResult(req);
    console.log(req.body.genre);
    console.log(book.genre);

    if (!errors.isEmpty()) {
      const allAuthors = await Author.find().sort({ family_name: 1 }).exec();
      const allGenres = await Genre.find().sort({ name: 1 }).exec();
      const currentAuthorId = book.author;
      const currentGenres = book.genre;

      res.render("book_update", {
        title: "Update Book",
        book,
        allAuthors,
        allGenres,
        currentAuthorId,
        currentGenres,
        errors: errors.array(),
      });
      return;
    } else {
      await Book.findByIdAndUpdate(book._id, book);
      res.redirect(book.url);
    }
  }),
];
