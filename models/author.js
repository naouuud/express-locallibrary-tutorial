const mongoose = require("mongoose");
const { DateTime } = require("luxon");

const Schema = mongoose.Schema;

const AuthorSchema = new Schema({
  first_name: { type: String, required: true, maxLength: 100 },
  family_name: { type: String, required: true, maxLength: 100 },
  date_of_birth: { type: Date },
  date_of_death: { type: Date },
});

AuthorSchema.virtual("name").get(function () {
  let fullname = "";
  if (this.first_name && this.family_name) {
    fullname = `${this.family_name}, ${this.first_name}`;
  }

  return fullname;
});

AuthorSchema.virtual("url").get(function () {
  return `/catalog/author/${this._id}`;
});

AuthorSchema.virtual("birth_formatted").get(function () {
  return DateTime.fromJSDate(this.date_of_birth).toLocaleString(
    DateTime.DATE_MED
  );
});

AuthorSchema.virtual("death_formatted").get(function () {
  return DateTime.fromJSDate(this.date_of_death).toLocaleString(
    DateTime.DATE_MED
  );
});

AuthorSchema.virtual("lifespan_long").get(function () {
  let lifespan = "";
  if (this.date_of_birth) {
    lifespan += `Born: ${this.birth_formatted}`;
  }
  if (this.date_of_death) {
    lifespan += `, Died: ${this.death_formatted}`;
  }
  return lifespan;
});

AuthorSchema.virtual("lifespan_short").get(function () {
  let lifespan = "";
  if (!this.date_of_birth && !this.date_of_death) return;
  if (this.date_of_birth) {
    lifespan += `(${this.birth_formatted}`;
  }
  if (this.date_of_death) {
    lifespan += ` - ${this.death_formatted}`;
  }
  lifespan += ")";
  return lifespan;
});

AuthorSchema.virtual("birth_yyyy_mm_dd").get(function () {
  return DateTime.fromJSDate(this.date_of_birth).toISODate(); // format 'YYYY-MM-DD'
});

AuthorSchema.virtual("death_yyyy_mm_dd").get(function () {
  return DateTime.fromJSDate(this.date_of_death).toISODate(); // format 'YYYY-MM-DD'
});

module.exports = mongoose.model("Author", AuthorSchema);
