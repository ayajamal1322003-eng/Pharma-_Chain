using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PharmaChain.Migrations
{
    public partial class AddBlockNumber : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "BlockNumber",
                table: "DrugTransactions",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BlockNumber",
                table: "DrugTransactions");
        }
    }
}